const OPEN = 9, CLOSE = 17, SLOT_MIN = 60;

function slotTimes() {
  const out = [];
  for (let m = OPEN * 60; m < CLOSE * 60; m += SLOT_MIN)
    out.push(String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'));
  return out;
}

function isValidSlot(dt) {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:00$/.test(dt || '')) return false;
  return slotTimes().includes(dt.slice(11, 16));
}

module.exports = { slotTimes, isValidSlot };