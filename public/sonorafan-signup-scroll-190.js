/* SonoraFan v190: desktop mouse-wheel / touchpad scrolling on the signup modal.
 * Scrolling remains native on phones; Ctrl+wheel retains browser zoom.
 * Only intervenes when the modal is active and its scroll container can move.
 */
(function () {
  'use strict';
  var modal = document.getElementById('signupModal');
  if (!modal) return;

  modal.addEventListener('wheel', function (event) {
    if (!modal.classList.contains('active')) return;
    if (!modal.classList.contains('sf184-image-ready')) return;
    if (window.innerWidth < 1050 || event.ctrlKey || event.metaKey) return;
    if (event.defaultPrevented || Math.abs(event.deltaY) < 0.01) return;

    var maxScroll = modal.scrollHeight - modal.clientHeight;
    if (maxScroll < 1) return;

    var factor = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? modal.clientHeight : 1;
    var delta = event.deltaY * factor;
    var current = modal.scrollTop;
    var next = Math.max(0, Math.min(maxScroll, current + delta));
    if (Math.abs(next - current) < 0.01) return;

    // The signup artwork uses a clipped inner frame; route wheel motion to
    // the actual scrolling element even when the pointer is over form fields.
    event.preventDefault();
    modal.scrollTop = next;
  }, { passive: false });
})();
