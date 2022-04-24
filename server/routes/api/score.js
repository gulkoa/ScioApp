const question = {
    averageTime: 89,
    standardDeviation: 61.5,
}

solution = {
    time: 10,
}

const timeZScore = question.standardDeviation && question.standardDeviation != 0 ? (solution.time - question.averageTime) / question.standardDeviation : 0
console.log(timeZScore)
const score = timeZScore < 0 ? (-timeZScore/2 + 1) * 1000 : 1000
console.log(score)