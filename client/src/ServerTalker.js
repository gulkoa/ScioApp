import axios from 'axios'

const url = window.location.protocol + '//' + window.location.host + '/api/'
class ServerTalker {
    static async loadFeed(event, topicsNames, userID, accessToken) {
        return new Promise ((resolve,reject) => {
            axios.post(url + "question/loadFeed" , {
                event,
                topicsNames,
                userID
            },
            {
                headers: {
                    Authorization: 'Bearer ' + accessToken
                }
            })
            .then((res) => {
                if (res.data.status && res.data.question) {
                    const question = res.data.question;
                    resolve(question)
                } else {
                    reject(res.data)
                    console.log(res.data)
                }
            })
            .catch((err)=> {
                reject(err);
            })

        });
    }

    static async loadQuestion(questionID, userID, accessToken) {
        return new Promise ((resolve,reject) => {
            if (questionID === 'aurora1445') {
                resolve({"_id":{"$oid":"61a05902d63cbf8eddaf3ed7"},"prompt":"evaluate (A and B) or (A xor B) if A = 1 and B = 0","type":"MultipleChoice","options":["1","0","neither"],"secret":{"correctOptions":[{"$numberInt":"0"}]},"topic":"binary algebra","event":"Cybersecurity","showInFeed":true,"showInLibrary":true})
                return
            }

            axios.post(url + "question/loadQuestion" , {
                questionID,
                userID
            },
            {
                headers: {
                    Authorization: 'Bearer ' + accessToken
                }
            })
            .then((res) => {
                if (res.data.status && res.data.question) {
                    const question = res.data.question;
                    resolve(question)
                } else {
                    reject(res.data)
                    console.log(res.data)
                }
            })
            .catch((err)=> {
                reject(err);
            })

        });
    }

    static async loadLibrary(event, topicsNames, userID, accessToken) {
        return new Promise ((resolve,reject) => {
            axios.post(url + "question/loadLibrary", {
                event,
                topicsNames,
                userID
            },
            {
                headers: {
                    Authorization: 'Bearer ' + accessToken
                }
            })
                .then((res) => {
                    if (res.data.status && res.data.questions) {
                        const questions = res.data.questions;
                        resolve(questions)
                    } else {
                        reject(res.data)
                    }
                })
                .catch((err)=> {
                    reject(err);
                })
            
        });
    }

    static async submitSolution(solution, questionID, userID, accessToken) {
        return new Promise ((resolve,reject) => {
            axios.post(url + "question/submitSolution", {
                solution, 
                questionID,
                userID
            },
            {
                headers: {
                    Authorization: 'Bearer ' + accessToken
                }
            })
                .then((res) => {
                    if (res.data.status) {
                        const reply = {
                            ...res.data,
                        }
                        resolve(reply)
                    } else {
                        reject(res.data)
                    }
                })
                .catch((err)=> {
                    reject(err);
                })
            
        });
    }

    static async mockSubmitSolution(question, userID, accessToken) {
        return new Promise ((resolve,reject) => {
            axios.post(url + "question/mockSubmitSolution", {
                ...question,
                userID: userID
            },
            {
                headers: {
                    Authorization: 'Bearer ' + accessToken
                }
            })
                .then((res) => {
                    if (res.data.status) {
                        const reply = {
                            ...res.data,
                        }
                        resolve(reply)
                    } else {
                        reject("Unresolved server error")
                    }
                })
                .catch((err)=> {
                    reject(err);
                })
            
        });
    }

    static async addQuestion(question, userID, accessToken) {
        return new Promise ((resolve,reject) => {
            axios.post(url + "question/addQuestion", {
                question,
                userID
            },
            {
                headers: {
                    Authorization: 'Bearer ' + accessToken
                }
            })
            .then((res) => {
                if (res.data.status) {
                    resolve(res.data)
                } else {
                    reject(res.data)
                }
            })
            .catch((err)=> {
                reject(err);
            })
        })
    }

    static async permission(userId, accessToken, permission) {
        return new Promise ((resolve) => {
            axios.post(url + "user/permission/" + permission.replace(':', '-'), {
                userId
            },
            {
                headers: {
                    Authorization: 'Bearer ' + accessToken
                }
            })
            .then((res) => {
                if (res.data.status) {
                    resolve(true)
                }
                else {
                    resolve(false)
                }
            })
            .catch(()=> {
                resolve(false)
            })
        })
    }
    

    static async getEvents(accessToken) {
        return new Promise ((resolve,reject) => {
            axios.get(url + "question/getEvents", {
                headers: {
                    Authorization: 'Bearer ' + accessToken
                }
            })
            .then((res) => {
                const events = res.data.events;
                resolve(events)
            })
            .catch((err)=> {
                reject(err);
            })
            
        });
    }

    static async getRanking(event, userID, accessToken) {
        return this.post(url + "question/getRanking", userID, accessToken, {event})
    }

    static async loadTest(testID, userID, accessToken) {
        return this.post(url + "question/loadTest", userID, accessToken, {testID})
    }

    static async submitTest(testID, testSolutions, userID, accessToken) {
        return this.post(url + "question/submitTest", userID, accessToken, {testID, testSolutions})
    }

    static async addTest(test, userID, accessToken) {
        return this.post(url + "question/addTest", userID, accessToken, {test})
    }

    static async MADTON(topic, userID, accessToken) {
        return this.post(url + "question/MADTON", userID, accessToken, {topic})
    }

    static async encrypt(plaintext, topic, userID, accessToken) {
        return this.post(url + "question/encrypt", userID, accessToken, {plaintext, topic})
    }

    static async getTests(event, userID, accessToken) {
        return this.post(url + "question/loadTests", userID, accessToken, {event})
    }

    static async post(url, userID, accessToken, args) {
        console.log(args)
        return new Promise ((resolve, reject) => {
            axios.post(url, {
                ...args,
                userID
            },
            {
                headers: {
                    Authorization: 'Bearer ' + accessToken
                }
            })
            .then((res) => {
                if (res.data.status) {
                    resolve(res.data)
                } else {
                    reject(res.data)
                }
            })
            .catch((err)=> {
                reject(err)
            })
        })
    }

}

    // //CreatePost
    // static insertPost(text) {
    //     return axios.post(url, {
    //         text
    //     })
    // }
    // //DeletePost
    // static deletePost(id) {
    //     return axios.delete(`${url}${id}`)
    // }


export default ServerTalker