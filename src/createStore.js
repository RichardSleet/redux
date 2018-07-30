import $$observable from 'symbol-observable'

import ActionTypes from './utils/actionTypes'

import isPlainObject from './utils/isPlainObject'
/**
 * @param {Function} reducer 一个函数通过传入的 当前的 state 和 action 返回一个新的 state
 * 
 * @param {any} [preloadedState] 初始化的 state, 一般通过触发 reducer 来隐式得到
 *
 * @param {Function} [enhancer] 一个针对于 createStore 的高阶函数
 *
 * @returns {Store}
 * 
 * {
    dispatch, // 触发 action
    subscribe, // 订阅 state 的改变
    getState, // 获取 state
    replaceReducer, // 替换 reducer
    [$$observable]: observable // about rxjs
  }
 */
export default function createStore(reducer, preloadedState, enhancer) {
  // 当第二个参数是 function 时, 自动设置为 enhancer
  if (typeof preloadedState === 'function' && typeof enhancer === 'undefined') {
    enhancer = preloadedState
    preloadedState = undefined
  }

  if (typeof enhancer !== 'undefined') {
    // 传入 enhancer 
    if (typeof enhancer !== 'function') {
      throw new Error('Expected the enhancer to be a function.')
    }
    // enhancer 类似于Hoc,其返回值为 createStore 函数
    return enhancer(createStore)(reducer, preloadedState)
  }

  // reducer 必须是一个函数
  if (typeof reducer !== 'function') {
    throw new Error('Expected the reducer to be a function.')
  }

  let currentReducer = reducer
  let currentState = preloadedState

  /**
   * state 改变的订阅者
   * 建立两个 listener 防止当前 state 改变又同时改变 listener 的操作
   */
  let currentListeners = []
  let nextListeners = currentListeners
  let isDispatching = false

  // 深拷贝赋值
  function ensureCanMutateNextListeners() {
    if (nextListeners === currentListeners) {
      // deep copy
      nextListeners = currentListeners.slice()
    }
  }
  // 获取当前状态
  function getState() {
    if (isDispatching) {
      throw new Error(
        'You may not call store.getState() while the reducer is executing. ' +
          'The reducer has already received the state as an argument. ' +
          'Pass it down from the top reducer instead of reading it from the store.'
      )
    }
    return currentState
  }

  // 订阅监听队列(观察者)
  function subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new Error('Expected the listener to be a function.')
    }

    if (isDispatching) {
      throw new Error(
        'You may not call store.subscribe() while the reducer is executing. ' +
          'If you would like to be notified after the store has been updated, subscribe from a ' +
          'component and invoke store.getState() in the callback to access the latest state. ' +
          'See https://redux.js.org/api-reference/store#subscribe(listener) for more details.'
      )
    }
    let isSubscribed = true
    // 深copy下一个,监听队列
    ensureCanMutateNextListeners()
    nextListeners.push(listener)
    return function unsubscribe() {
      if (!isSubscribed) {
        return
      }
      if (isDispatching) {
        throw new Error(
          'You may not unsubscribe from a store listener while the reducer is executing. ' +
            'See https://redux.js.org/api-reference/store#subscribe(listener) for more details.'
        )
      }
      isSubscribed = false
      ensureCanMutateNextListeners()
      // 剔除观察者,但是当前的 listener 并没有被清除
      nextListeners.splice(nextListeners.indexOf(listener), 1)
    }
  }
  //触发action
  function dispatch(action) {
    
    if (!isPlainObject(action)) {
      throw new Error(
        'Actions must be plain objects. ' +
          'Use custom middleware for async actions.'
      )
    }

    if (typeof action.type === 'undefined') {
      throw new Error(
        'Actions may not have an undefined "type" property. ' +
          'Have you misspelled a constant?'
      )
    }

    if (isDispatching) {
      throw new Error('Reducers may not dispatch actions.')
    }

    try {
      isDispatching = true
      // 更新 state
      currentState = currentReducer(currentState, action)
    } finally {
      isDispatching = false
    }

    // 获取最新的订阅者
    const listeners = (currentListeners = nextListeners)
    // 触发action以后相应订阅者
    for (let i = 0; i < listeners.length; i++) {
      const listener = listeners[i]
      // nextListener的存在 是为了防止在调用 listener() 时 listener 的队列 发生改变  
      listener()
    }
    return action
  }

  // 更换新的reducer
  function replaceReducer(nextReducer) {
    if (typeof nextReducer !== 'function') {
      throw new Error('Expected the nextReducer to be a function.')
    }
    currentReducer = nextReducer
    dispatch({ type: ActionTypes.REPLACE })
  }

  function observable() {
    const outerSubscribe = subscribe
    return {
      subscribe(observer) {
        if (typeof observer !== 'object' || observer === null) {
          throw new TypeError('Expected the observer to be an object.')
        }

        function observeState() {
          if (observer.next) {
            observer.next(getState())
          }
        }

        observeState()
        const unsubscribe = outerSubscribe(observeState)
        return { unsubscribe }
      },

      [$$observable]() {
        return this
      }
    }
  }

  // 初始化通过触发dispatch拿到initState
  dispatch({ type: ActionTypes.INIT })

  return {
    dispatch, // done
    subscribe, // done
    getState, // done
    replaceReducer, // done
    [$$observable]: observable // about rxjs
  }
}
