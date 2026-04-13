/**
 * One-off data migration: reassign every record keyed by a legacy Auth0
 * user ID to a new ObjectId-style userID.
 *
 * Collections touched:
 *   submissions.userID
 *   test_submissions.userID
 *   questions.submittedBy
 *   tests.submittedBy
 *
 * Usage:
 *   MONGODB_USERNAME=xxx MONGODB_PASSWORD=xxx \
 *     node server/scripts/reassignUser.js \
 *       auth0|6251e28defc16b0068476678 69c8b664cebfd64492b0f2c7
 *
 * Or, to just preview the counts without writing, append --dry-run.
 */

require('dotenv').config()
const mongodb = require('mongodb')

const [,, fromArg, toArg, ...rest] = process.argv
const DRY = rest.includes('--dry-run')

if (!fromArg || !toArg) {
    console.error('Usage: node server/scripts/reassignUser.js <fromUserID> <toUserID> [--dry-run]')
    process.exit(1)
}

const CONN = `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@cluster0.ofpmb.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`

async function run() {
    const client = await mongodb.MongoClient.connect(CONN, { useNewUrlParser: true })
    console.log('Connected to MongoDB Atlas')
    const db = client.db('scioapp')

    const targets = [
        { collection: 'submissions',      field: 'userID' },
        { collection: 'test_submissions', field: 'userID' },
        { collection: 'questions',        field: 'submittedBy' },
        { collection: 'tests',            field: 'submittedBy' }
    ]

    console.log(`\nReassigning ${fromArg}  →  ${toArg}${DRY ? '  (DRY RUN)' : ''}\n`)

    for (const { collection, field } of targets) {
        const coll = db.collection(collection)
        const count = await coll.countDocuments({ [field]: fromArg })
        if (count === 0) {
            console.log(`  ${collection}.${field}: 0 matching — skipped`)
            continue
        }
        if (DRY) {
            console.log(`  ${collection}.${field}: ${count} would be updated`)
        } else {
            const res = await coll.updateMany(
                { [field]: fromArg },
                { $set: { [field]: toArg } }
            )
            console.log(`  ${collection}.${field}: matched=${res.matchedCount} modified=${res.modifiedCount}`)
        }
    }

    console.log('\nDone.')
    await client.close()
}

run().catch(err => {
    console.error('Failed:', err)
    process.exit(1)
})
