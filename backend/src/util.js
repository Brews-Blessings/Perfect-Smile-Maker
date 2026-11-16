exports.manilaToday = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });