'use strict';

(function () {
  // Список эмоджи-иконок из которых случано выбираются иконки для карточек
  const EMOJIES = ['🐶','🐱','🐭','🐹','🐰','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐙','🐵','🦄','🐞','🦀','🐟','🐊','🐓','🦃'];

  // время игры в секундах
  const TIMEOUT = 60;

  /**
   * Класс карточки
   */
  class Card {
    elem = null;
    emoji = null;
    state = {
      turned: false,
      success: false,
      failed: false
    };

    /**
     * @param {HTMLElement} elem - DOM-элемент карточки
     * @param {string} emoji - символ эмоджи-иконки
     * @constructor
     */
    constructor(elem, emoji) {
      this.elem = elem;
      this.emoji = emoji;
      this.elem.querySelector('.back').textContent = this.emoji;
      this.render();
    }

    /**
     * Устанавливает новое состояние карточки
     * @param {Object} state
     * @param {boolean} state.turned - карточка перевернута
     * @param {boolean} state.success - успешно угаданная карточка (при открытии 2-х одинаковых карточек)
     * @param {boolean} state.failed - не успешно открытая карточка (при отркрытии 2-х разных карточек)
     */
    setState(state) {
      this.state = {
        ...this.state,
        ...state
      };
      if (!this.state.turned) {
        this.state.failed = false;
        this.state.success = false;
      }
      this.render();
    }

    render() {
      this.elem.classList.toggle('success', this.state.success);
      this.elem.classList.toggle('failed', this.state.failed);
      this.elem.classList.toggle('turned', this.state.turned);
    }

    /**
     * Переворачивает карточку
     */
    turn() {
      this.setState({turned: !this.state.turned});
    }
  }

  /**
   * Класс таймера
   */
  class Timer {
    timeout = 60;
    interval = null;
    timeleft = null;
    timerElement = null;
    started = false;

    constructor(timerElement, timeout) {
      this.timerElement = timerElement;
      this.timeout = timeout;
    }

    start(timeoutCallback) {
      this.reset();
      this.interval = setInterval(() => {
        this.timeleft--;
        this.render();
        if (this.timeleft === 0) {
          this.stop();
          timeoutCallback();
        }
      }, 1000);
      this.render();
      this.started = true;
    }

    stop() {
      clearInterval(this.interval);
      this.interval = null;
      this.started = false;
    }

    reset() {
      this.timeleft = this.timeout;
      this.started = false;
      this.render();
    }

    render() {
      this.timerElement.textContent = this.formatTime(this.timeleft);
    }

    formatTime(seconds) {
      let minutes = Math.floor(seconds / 60);
      seconds = seconds % 60;
      minutes = minutes < 10 ? '0' + minutes : minutes;
      seconds = seconds < 10 ? '0' + seconds : seconds;
      return `${minutes}:${seconds}`;
    }
  }

  /**
   * Класс игры
   */
  class Memoji {
    emojies = null;
    elems = null;
    cards = null;
    container = null;
    timer = null;
    popup = null;

    constructor(container, emojies, timeout) {
      this.container = container;
      this.popup = this.container.querySelector('.popup');
      this.elems = this.container.querySelectorAll('.card');
      this.emojies = emojies;
      this.timer = new Timer(this.container.querySelector('.timer'), timeout);
      this._addEventListeners();
      this.init();
    }

    /**
     * Инициализирует карточки случайным набором картинок
     */
    init() {
      let randomEmojies = Memoji.getRandomEmojies(this.emojies, this.elems.length / 2);
      this.cards = Array.from(this.elems).map(elem => new Card(elem, randomEmojies.shift()));
      this.timer.reset();
      this.lastTurnedCard = null;
    }

    showPopup(win = false) {
      this.popup.querySelector('.popup__text').innerHTML = this._getPopupText(win);
      this.popup.querySelector('.popup__button').textContent = win ? 'Play again' : 'Try again';
      this.popup.style.display = 'block';
    }

    _getPopupText(win) {
      let text = win ? 'Win' : 'Lose';
      return text.split('').map(char => `<span>${char}</span>`).join('');
    }

    closePopup() {
      this.popup.style.display = 'none';
    }

    _onCardClick(elem) {
      if (!this.timer.started) {
        this.timer.start(this.showPopup.bind(this));
      }

      let card = this._getCardByElem(elem);

      if (card.state.turned) return;

      card.turn();
      this._turnFailedCards();

      // Если уже открыта карточка
      if (this.lastTurnedCard) {
        // и кликнули по другой карточке
        if (card !== this.lastTurnedCard) {
          if (this.lastTurnedCard.emoji === card.emoji) {
            // картинки карточек совпадают
            card.setState({success: true});
            this.lastTurnedCard.setState({success: true});

          } else {
            // картинки не совпадают
            card.setState({failed: true});
            this.lastTurnedCard.setState({failed: true});
          }
        }
        this.lastTurnedCard = null;
      } else {
        // запоминаем первую открытую карточку
        this.lastTurnedCard = card;
      }

      if (this.cards.every(card => card.state.success)) {
        this.timer.stop();
        this.showPopup(true);
      }
    }

    _turnFailedCards() {
      this.cards.forEach(card => {
        if (card.state.failed) card.turn();
      })
    }

    _getCardByElem(elem) {
      return this.cards.filter(card => {
        return card.elem === elem;
      })[0];
    }

    _addEventListeners() {
      this.container.addEventListener('click', this._onContainerClick.bind(this));
      this.popup.querySelector('.popup__button').addEventListener('click', () => {
        this.closePopup();
        this.init();
      });
    }

    _onContainerClick(event) {
      let target = event.target;

      // цикл двигается вверх от target к родителям до корневого элемента игры
      while (target !== this.container) {
        if (target.classList.contains('card')) {
          // нашли карточку
          this._onCardClick(target);
          return;
        }
        target = target.parentNode;
      }
    }

    static getRandomEmojies(emojies, count) {
      emojies = emojies.slice();
      let result = [];

      for(let i = 0; i < count; i++) {
        let randomIndex = Math.floor(Math.random() * emojies.length);
        let randomEmoji = emojies[randomIndex];

        emojies.splice(randomIndex, 1);

        result.push(randomEmoji, randomEmoji);
      }

      return shuffleArray(result);
    }
  }

  /**
   * Перемешивает массив случайным образом
   * @param {Array} arr - массив
   * @returns {Array}
   */
  function shuffleArray(arr) {
    return arr.sort((a, b) => {
      return Math.random() - 0.5;
    });
  }

  /**
   * Создает экземпляр игры и запускает ее
   */
  function start() {
    const container = document.getElementById('memoji');
    const memoji = new Memoji(container, EMOJIES, TIMEOUT);
  }

  start();
})();