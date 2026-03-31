/**
 * Migration script: old multi-database schema → single scioapp database
 *
 * Copies data from:
 *   questions.questions0  → scioapp.questions
 *   submissions.submissions0 → scioapp.submissions
 *   users.users            → scioapp.users
 *   users.events (or config.events) → scioapp.events
 *   tests.tests            → scioapp.tests
 *   tests.submissions      → scioapp.test_submissions
 *
 * Changes applied during migration:
 *   - submissions: timestamp Number → Date, drop questionType, add source field
 *   - submissions: questionID 'madton' → null with source: 'madton'
 *   - questions: submittedTimeStamp → createdAt (Date), drop averageTime/standardDeviation
 *   - tests: submittedTimeStamp → createdAt (Date)
 *   - users: createdAt stays as Date (already correct)
 *   - Creates indexes on new collections
 *
 * Skips ranking collection (dead weight).
 *
 * Usage: MONGODB_USERNAME=xxx MONGODB_PASSWORD=xxx node server/migrate.js
 */

require('dotenv').config()
const mongodb = require('mongodb')

const CONN = `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@cluster0.ofpmb.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`

async function migrate() {
    const client = await mongodb.MongoClient.connect(CONN, { useNewUrlParser: true })
    console.log('Connected to MongoDB Atlas')

    // Source collections (old schema)
    const oldQuestions = client.db('questions').collection('questions0')
    const oldSubmissions = client.db('submissions').collection('submissions0')
    const oldUsers = client.db('users').collection('users')
    const oldTests = client.db('tests').collection('tests')
    const oldTestSubs = client.db('tests').collection('submissions')

    // Try config.events first, fall back to users.events
    let oldEvents
    const configEventsCount = await client.db('config').collection('events').countDocuments().catch(() => 0)
    if (configEventsCount > 0) {
        oldEvents = client.db('config').collection('events')
    } else {
        oldEvents = client.db('users').collection('events')
    }

    // Target database
    const newDb = client.db('scioapp')

    // Check if scioapp already has data (safety check)
    const existingUsers = await newDb.collection('users').countDocuments()
    if (existingUsers > 0) {
        console.log('WARNING: scioapp database already has data!')
        console.log('  users:', existingUsers)
        console.log('  questions:', await newDb.collection('questions').countDocuments())
        console.log('  submissions:', await newDb.collection('submissions').countDocuments())
        console.log('Aborting to prevent duplicates. Drop the scioapp database first if you want to re-run.')
        process.exit(1)
    }

    // --- 1. Migrate users (minimal changes) ---
    console.log('\n--- Migrating users ---')
    const users = await oldUsers.find({}).toArray()
    if (users.length > 0) {
        // Users are already in good shape, just ensure createdAt is a Date
        const mappedUsers = users.map(u => ({
            ...u,
            createdAt: u.createdAt instanceof Date ? u.createdAt : new Date(u.createdAt || Date.now())
        }))
        await newDb.collection('users').insertMany(mappedUsers)
    }
    console.log(`  Migrated ${users.length} users`)

    // --- 2. Migrate events ---
    console.log('\n--- Migrating events ---')
    const events = await oldEvents.find({}).toArray()
    if (events.length > 0) {
        // Strip _id so MongoDB assigns new ones (in case of ObjectId conflicts)
        const mappedEvents = events.map(({ _id, ...rest }) => rest)
        await newDb.collection('events').insertMany(mappedEvents)
    }
    // Re-read to get new _ids (not used for migration since we keep event as string)
    console.log(`  Migrated ${events.length} events`)

    // --- 3. Migrate questions ---
    console.log('\n--- Migrating questions ---')
    const questions = await oldQuestions.find({}).toArray()
    if (questions.length > 0) {
        const mappedQuestions = questions.map(q => {
            const mapped = { ...q }
            // submittedTimeStamp → createdAt
            if (mapped.submittedTimeStamp) {
                mapped.createdAt = new Date(mapped.submittedTimeStamp)
                delete mapped.submittedTimeStamp
            } else {
                mapped.createdAt = new Date()
            }
            // Drop cached computed fields
            delete mapped.averageTime
            delete mapped.standardDeviation
            return mapped
        })
        await newDb.collection('questions').insertMany(mappedQuestions)
    }
    console.log(`  Migrated ${questions.length} questions`)

    // --- 4. Migrate submissions ---
    console.log('\n--- Migrating submissions ---')
    const submissions = await oldSubmissions.find({}).toArray()
    if (submissions.length > 0) {
        const mappedSubmissions = submissions.map(s => {
            const mapped = { ...s }
            // timestamp: Number → Date
            mapped.timestamp = new Date(mapped.timestamp)
            // questionID: 'madton' → null, add source field
            if (mapped.questionID === 'madton') {
                mapped.questionID = null
                mapped.source = 'madton'
            } else {
                mapped.source = 'question'
            }
            // Drop questionType (unused denormalization)
            delete mapped.questionType
            return mapped
        })
        await newDb.collection('submissions').insertMany(mappedSubmissions)
    }
    console.log(`  Migrated ${submissions.length} submissions`)

    // --- 5. Migrate tests ---
    console.log('\n--- Migrating tests ---')
    const tests = await oldTests.find({}).toArray()
    if (tests.length > 0) {
        const mappedTests = tests.map(t => {
            const mapped = { ...t }
            if (mapped.submittedTimeStamp) {
                mapped.createdAt = new Date(mapped.submittedTimeStamp)
                delete mapped.submittedTimeStamp
            } else {
                mapped.createdAt = new Date()
            }
            return mapped
        })
        await newDb.collection('tests').insertMany(mappedTests)
    }
    console.log(`  Migrated ${tests.length} tests`)

    // --- 6. Migrate test submissions ---
    console.log('\n--- Migrating test_submissions ---')
    const testSubs = await oldTestSubs.find({}).toArray()
    if (testSubs.length > 0) {
        const mappedTestSubs = testSubs.map(ts => {
            const mapped = { ...ts }
            if (typeof mapped.timestamp === 'number') {
                mapped.timestamp = new Date(mapped.timestamp)
            }
            return mapped
        })
        await newDb.collection('test_submissions').insertMany(mappedTestSubs)
    }
    console.log(`  Migrated ${testSubs.length} test_submissions`)

    // --- 7. Create indexes ---
    console.log('\n--- Creating indexes ---')

    await newDb.collection('users').createIndex({ email: 1 }, { unique: true })
    console.log('  users: { email: 1 } unique')

    await newDb.collection('events').createIndex({ name: 1 }, { unique: true })
    console.log('  events: { name: 1 } unique')

    await newDb.collection('questions').createIndex({ event: 1, topic: 1, showInFeed: 1 })
    await newDb.collection('questions').createIndex({ event: 1, topic: 1, showInLibrary: 1 })
    console.log('  questions: { event, topic, showInFeed } + { event, topic, showInLibrary }')

    await newDb.collection('submissions').createIndex({ questionID: 1, userID: 1 })
    await newDb.collection('submissions').createIndex({ event: 1, 'checkReport.correct': 1, timestamp: 1 })
    await newDb.collection('submissions').createIndex({ userID: 1, event: 1 })
    console.log('  submissions: { questionID, userID } + { event, correct, timestamp } + { userID, event }')

    await newDb.collection('tests').createIndex({ event: 1 })
    console.log('  tests: { event: 1 }')

    await newDb.collection('test_submissions').createIndex({ testID: 1, userID: 1 })
    console.log('  test_submissions: { testID, userID }')

    // --- Summary ---
    console.log('\n=== Migration complete ===')
    console.log('  users:', await newDb.collection('users').countDocuments())
    console.log('  events:', await newDb.collection('events').countDocuments())
    console.log('  questions:', await newDb.collection('questions').countDocuments())
    console.log('  submissions:', await newDb.collection('submissions').countDocuments())
    console.log('  tests:', await newDb.collection('tests').countDocuments())
    console.log('  test_submissions:', await newDb.collection('test_submissions').countDocuments())
    console.log('\nSkipped: ranking collection (unused)')
    console.log('Now update server code to use scioapp database.')

    await client.close()
}

migrate().catch(err => {
    console.error('Migration failed:', err)
    process.exit(1)
})
