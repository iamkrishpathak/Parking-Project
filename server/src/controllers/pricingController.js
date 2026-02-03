const calculateDynamicPrice = (space, entryTime) => {
  // Start with base price
  let finalPrice = space.base_price;
  let multiplier = 1.0;

  // Weekend Check (Saturday = 6, Sunday = 0)
  const entryDay = new Date(entryTime).getDay();
  if (entryDay === 6 || entryDay === 0) {
    multiplier = 1.5;
  }

  // Occupancy Check
  const occupancyRate = space.current_bookings / space.capacity;
  
  if (occupancyRate > 0.8) {
    multiplier = Math.max(multiplier, 1.5);
  } else if (occupancyRate > 0.5) {
    multiplier = Math.max(multiplier, 1.2);
  }

  // Festival Config - Major Indian festivals (month-day format for year-independent matching)
  const festivalDates = [
    '01-14', // Makar Sankranti
    '01-26', // Republic Day
    '03-14', // Holi
    '03-31', // Ram Navami
    '04-14', // Baisakhi
    '08-15', // Independence Day
    '08-31', // Ganesh Chaturthi
    '10-02', // Gandhi Jayanti
    '10-20', // Dussehra
    '11-01', // Diwali
    '12-25', // Christmas
  ];

  // Check if entryTime matches any festival date (month-day format)
  const entryDate = new Date(entryTime);
  const entryMonthDay = `${String(entryDate.getMonth() + 1).padStart(2, '0')}-${String(entryDate.getDate()).padStart(2, '0')}`;
  if (festivalDates.includes(entryMonthDay)) {
    multiplier = 3.0;
  }

  // Calculate final price and round to integer
  finalPrice = Math.round(finalPrice * multiplier);
  
  return finalPrice;
};

module.exports = {
  calculateDynamicPrice,
};