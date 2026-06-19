let toastId = 0;

export function showToast(dispatch, message, type = 'info', duration = 4000) {
  const _id = ++toastId;
  dispatch({ type: 'ADD_TOAST', payload: { message, type, _id } });
  setTimeout(() => dispatch({ type: 'REMOVE_TOAST', payload: _id }), duration);
}