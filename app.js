// Native dialogs provide focus containment, Escape dismissal, and focus restoration.
document.querySelectorAll('[data-dialog]').forEach(button => {
  button.addEventListener('click', () => {
    document.getElementById(button.dataset.dialog).showModal();
  });
});
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.querySelectorAll('[data-close]').forEach(button => {
    button.addEventListener('click', () => dialog.close());
  });
  dialog.addEventListener('click', event => {
    const box = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) dialog.close();
  });
});
