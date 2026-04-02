<template>
  <div class="mb-3 form-check">



    <button class="btn btn-danger m-2" @click="reset()" :disabled="disabled"> Reset </button>

    <button class="btn btn-primary m-2" @click="autoJumpToggle()" :disabled="disabled"> AutoJump: {{autoJumpText}} </button>

    <button class="btn btn-primary m-2" @click="letterSyncToggle()" :disabled="disabled"> LetterSync: {{letterSyncText}} </button>

    <div class="popup m-2" @mouseenter="togglePopup(true)" @mouseleave="togglePopup(false)">
      <span class="popuptext" :id="question._id + 'shortcutPopout'">Keyboard shortcuts:<br>Arrow Left/Right - skip between boxes <br>Backspace - remove and skip back <br>Delete - remove <br>Enter - submit  <br>Right control - toggle AutoJump <br>Left control - toggle LetterSync</span>

    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-keyboard" viewBox="0 0 16 16">
  <path d="M14 5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h12zM2 4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H2z"/>
  <path d="M13 10.25a.25.25 0 0 1 .25-.25h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5a.25.25 0 0 1-.25-.25v-.5zm0-2a.25.25 0 0 1 .25-.25h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5a.25.25 0 0 1-.25-.25v-.5zm-5 0A.25.25 0 0 1 8.25 8h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5A.25.25 0 0 1 8 8.75v-.5zm2 0a.25.25 0 0 1 .25-.25h1.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-1.5a.25.25 0 0 1-.25-.25v-.5zm1 2a.25.25 0 0 1 .25-.25h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5a.25.25 0 0 1-.25-.25v-.5zm-5-2A.25.25 0 0 1 6.25 8h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5A.25.25 0 0 1 6 8.75v-.5zm-2 0A.25.25 0 0 1 4.25 8h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5A.25.25 0 0 1 4 8.75v-.5zm-2 0A.25.25 0 0 1 2.25 8h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5A.25.25 0 0 1 2 8.75v-.5zm11-2a.25.25 0 0 1 .25-.25h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5a.25.25 0 0 1-.25-.25v-.5zm-2 0a.25.25 0 0 1 .25-.25h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5a.25.25 0 0 1-.25-.25v-.5zm-2 0A.25.25 0 0 1 9.25 6h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5A.25.25 0 0 1 9 6.75v-.5zm-2 0A.25.25 0 0 1 7.25 6h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5A.25.25 0 0 1 7 6.75v-.5zm-2 0A.25.25 0 0 1 5.25 6h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5A.25.25 0 0 1 5 6.75v-.5zm-3 0A.25.25 0 0 1 2.25 6h1.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-1.5A.25.25 0 0 1 2 6.75v-.5zm0 4a.25.25 0 0 1 .25-.25h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5a.25.25 0 0 1-.25-.25v-.5zm2 0a.25.25 0 0 1 .25-.25h5.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-5.5a.25.25 0 0 1-.25-.25v-.5z"/>
    </svg>
    </div>

    <div :id="question._id + 'lettersDiv'" class="m-5"></div>

    <div :id="question._id + 'letterCountDiv'" class="m-5"></div>


  </div>
</template>

<script>
export default {
  name: 'Cryptography',
  props: {
    question: Object,
    disabled: Boolean,
  },
  data() {
    return {
      // question: {
      //   reply: null,
      // },
      lettersDiv: null,
      letterCountDiv: null,
      messages: {
        submittion: '',
        error: '',
      },

      alphabet: {
        A: ' ', B: ' ', C: ' ', D: ' ', E: ' ', F: ' ', G: ' ', H: ' ', I: ' ', J: ' ', K: ' ', L: ' ', M: ' ', N: ' ', O: ' ', P: ' ', Q: ' ', R: ' ', S: ' ', T: ' ', U: ' ', V: ' ', W: ' ', X: ' ', Y: ' ', Z: ' ',
      },

      fields: [],

      submitted: false,
      showReply: false,

      autoJump: true,
      autoJumpText: 'ON',

      letterSync: false,
      letterSyncText: 'OFF',

      freqFields: {},
    }
  },
  async mounted() {
    // this.question = this.recQuestion.question
    this.lettersDiv = document.getElementById(this.question._id + 'lettersDiv')
    this.letterCountDiv = document.getElementById(this.question._id + 'letterCountDiv')

    this.question.solution = this.question.solution || {}
    this.question.solution.text = this.question.solution.text || ''

    
    this.loadLetters()
    if (this.question.frequencyTableType !== 'None') {
      this.loadLetterCount()
    }
    
    
  },
  methods: {

    togglePopup(state) {
      if (state)
      document.getElementById(this.question._id + 'shortcutPopout').classList.add('show')
      else
      document.getElementById(this.question._id + 'shortcutPopout').classList.remove('show')
    },

    loadLetters() {
      const words = this.question.ciphertext.split(' ')
      for (let word of words) {
        const wordBox = document.createElement('div')
        wordBox.className = 'wordBox'
        for (let letter of word) {
          wordBox.appendChild(this.makeLetterBox(letter))
        }
        this.lettersDiv.appendChild(wordBox)
      }
    },

    makeLetterBox(symbol) {
      const letterBox = document.createElement('span')
      letterBox.className = 'letterBox'


      if (symbol === ' ')
        letterBox.innerHTML = '_'
      symbol = symbol.toUpperCase()
      
      const symbolField = document.createElement('span')
      symbolField.className = 'symbolField'
      symbolField.textContent = symbol
      letterBox.appendChild(symbolField)

      //pick an index
      const thisIndex = this.fields.length
      
      //if it is a letter, add an input field called 'letterField'
      if (this.alphabet[symbol]) {
        const letterField = document.createElement('input')
        letterField.className = 'letterField'
        letterField.disabled = this.disabled
        if (this.question.solution && this.question.solution.text[thisIndex])
          letterField.value = this.question.solution.text[thisIndex]

        letterField.dataset.symbol = symbol

        letterField.onfocus = () => {
          letterField.select()
        }


        letterField.oninput = () => {
            if (letterField.value.length > 1)
                letterField.value = letterField.value.substring(letterField.value.length - 1)
              letterField.value = letterField.value.toUpperCase()

            if (this.letterSync) {
              this.syncFields(symbol, letterField.value)
            }

            if (this.autoJump)
              this.fields[(thisIndex+1)%this.fields.length].focus()
            this.updateSolutionText()
        }

        letterField.onkeydown = (e) => {
            if (e.code === 'ArrowRight') {
              //select next field
              this.fields[(thisIndex+1)%this.fields.length].focus()
              //disable default action
              e.preventDefault()
            }
            else if (e.code === 'ArrowLeft') {
              //select previous field
              this.fields[(thisIndex-1+this.fields.length)%this.fields.length].focus()
              //disable default action
              e.preventDefault()
            }
            else if (e.code === 'Backspace') {
              //empty this field
              letterField.value = ''
              this.updateSolutionText()
              //select previous field
              this.fields[(thisIndex-1+this.fields.length)%this.fields.length].focus()
              //disable default action
              e.preventDefault()

            }
            else if (e.code === 'Enter') {
              //submit solution
              this.submit()
            }
            else if (e.code === 'Delete') {
              //clear field
              letterField.value = ''
              this.updateSolutionText()
            }
            else if (e.code === 'ControlRight') {
              this.autoJumpToggle()
            }
            else if (e.code === 'ControlLeft') {
              this.letterSyncToggle()
            }
        }

        this.fields.push(letterField)
        letterBox.appendChild(letterField)
      }

      //this.lettersDiv.appendChild(letterBox)
      return letterBox
    },
    updateSolutionText() {
      this.question.solution.text = this.fields.map(field => field.value != '' ? field.value : ' ').join('')
      this.$emit('update', this.question._id)
    },
    autoJumpToggle() {
      this.autoJump = !this.autoJump
      this.autoJumpText = this.autoJump ? 'ON' : 'OFF'
    },
    letterSyncToggle() {
      this.letterSync = !this.letterSync
      this.letterSyncText = this.letterSync ? 'ON' : 'OFF'
    },
    syncFields(symbol, value) {
      for (let field of this.fields) {
        if (field.dataset.symbol === symbol) {
          field.value = value
        }
      }
      if (this.freqFields[symbol]) {
        this.freqFields[symbol].value = value
      }
    },
    loadLetterCount() {
      const table = document.createElement('table')
      table.className = 'border text-center'
      this.letterCountDiv.appendChild(table)
      
      const letterRow = document.createElement('tr')
      letterRow.className = 'p-3'

      const coutRow = document.createElement('tr')

      const substituteRow = document.createElement('tr')

      if (!this.question.frequencyTableType || this.question.frequencyTableType === 'Regular') {
        table.appendChild(letterRow)
        table.appendChild(coutRow)
        table.appendChild(substituteRow)
      }
      else if (this.question.frequencyTableType === 'K2') {
        table.appendChild(substituteRow)
        table.appendChild(letterRow)
        table.appendChild(coutRow)
      }

      for (let letter in this.alphabet) {

        const letterCell = document.createElement('td')
        letterCell.className = 'letterCell border'
        letterCell.textContent = letter
        letterRow.appendChild(letterCell)

        const countCell = document.createElement('td')
        countCell.className = 'countCell border'
        countCell.textContent = this.question.ciphertext.split('').reduce((a, b) => a + (b === letter? 1 : 0), 0)
        coutRow.appendChild(countCell)

        const substituteCell = document.createElement('td')
        const inputCell = document.createElement('input')
        inputCell.className = 'letterField'
        substituteCell.appendChild(inputCell)
        substituteRow.appendChild(substituteCell)

        this.freqFields[letter] = inputCell

        inputCell.oninput = () => {
            if (inputCell.value.length > 1)
                inputCell.value = inputCell.value.substring(inputCell.value.length - 1)
              inputCell.value = inputCell.value.toUpperCase()

            if (this.letterSync) {
              this.syncFields(letter, inputCell.value)
              this.updateSolutionText()
            }
        }

        inputCell.onfocus = () => {
          inputCell.select()
        }
      }
    },

    reset() {
      this.fields.forEach(f => f.value = '')
      Object.values(this.freqFields).forEach(f => f.value = '')
      this.question.solution.text = ''
    },
    async submit() {
      this.$emit('submit')
    }
  },
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style>

  .wordBox {
    display: inline-block;
    margin: 6px;
    margin-bottom: 5px;
    padding: 1px;
  }

  .letterBox {
    font-size: 16pt;
    display: inline-block;
    text-align: center;
    min-width: 15px;
    height: 50px;
    vertical-align: top;
  }

  .letterField {
      display: block;
      width: 25px;
      height: 25px;
      margin: 1px;
      font-size: 12pt;
      text-align: center;
  }

  .symbolField {
    display: block;
  }
  


  .popup {
  position: relative;
  display: inline-block;
  cursor: pointer;
}

  /* The actual popup (appears on top) */
  .popup .popuptext {
    visibility: hidden;
    min-width: 300px;
    background-color: white;
    border: #555 1px solid;
    text-align: center;
    border-radius: 6px;
    padding: 8px 0;
    position: absolute;
    z-index: 1;
    top: 130%;
    left: 50%;
    margin-left: -150px;
  }

  /* Popup arrow */
  .popup .popuptext::after {
    content: "";
    position: absolute;
    bottom: 100%;
    left: 50%;
    margin-left: -5px;
    border-width: 5px;
    border-style: solid;
    border-color: transparent transparent #555 transparent;
  }

  /* Toggle this class when clicking on the popup container (hide and show the popup) */
  .popup .show {
    visibility: visible;
    -webkit-animation: fadeIn 0.2s;
    animation: fadeIn 0.2s
  }

  /* Add animation (fade in the popup) */
  @-webkit-keyframes fadeIn {
    from {opacity: 0;}
    to {opacity: 1;}
  }

  @keyframes fadeIn {
    from {opacity: 0;}
    to {opacity:1 ;}
  }

</style>
