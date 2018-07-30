/**
 * Composes single-argument functions from right to left. The rightmost
 * function can take multiple arguments as it provides the signature for
 * the resulting composite function.
 *
 * @param {...Function} funcs The functions to compose.
 * @returns {Function} A function obtained by composing the argument functions
 * from right to left. For example, compose(f, g, h) is identical to doing
 * (...args) => f(g(h(...args))).
 */

// 增强器粘合剂
export default function compose(...funcs) {
  // 没有就当作不存在
  if (funcs.length === 0) {
    // 这个离的 arg 会传入 createStore函数
    return arg => arg
  }

  // 只有一个
  if (funcs.length === 1) {
    return funcs[0]
  }

  [logger, applyMiddleware];
  // 人体蜈蚣?
  return funcs.reduce((a, b) => (...args) => a(b(...args)))
}
