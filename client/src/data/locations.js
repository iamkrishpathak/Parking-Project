// Comprehensive location database for PARKBANDHU
export const locationData = {
  'Delhi NCR': {
    cities: {
      'New Delhi': {
        places: [
          { name: 'Connaught Place (CP)', lat: 28.6328, lng: 77.2197 },
          { name: 'Janpath', lat: 28.626, lng: 77.218 },
          { name: 'India Gate', lat: 28.6129, lng: 77.2295 },
          { name: 'Rashtrapati Bhavan', lat: 28.6143, lng: 77.1996 },
          { name: 'Lotus Temple', lat: 28.5535, lng: 77.2588 },
        ],
      },
      'East Delhi': {
        places: [
          { name: 'Mayur Vihar Phase 1', lat: 28.6061, lng: 77.2946 },
          { name: 'Preet Vihar', lat: 28.6358, lng: 77.2934 },
          { name: 'Laxmi Nagar', lat: 28.6333, lng: 77.2833 },
        ],
      },
      'Noida': {
        places: [
          { name: 'Noida Extension', lat: 28.5355, lng: 77.3910 },
          { name: 'Sector 18', lat: 28.5675, lng: 77.3211 },
        ],
      },
      'Ghaziabad': {
        places: [
          { name: 'Ghaziabad City Center', lat: 28.6692, lng: 77.4538 },
          { name: 'Vaishali Metro Station', lat: 28.6514, lng: 77.3361 },
          { name: 'ABES Institute of Technology', lat: 28.6201, lng: 77.4414 },
        ],
      },
    },
  },
  'Uttar Pradesh': {
    cities: {
      'Agra': {
        places: [
          { name: 'Taj Mahal', lat: 27.1751, lng: 78.0421 },
          { name: 'Agra Fort', lat: 27.1797, lng: 78.0211 },
          { name: 'Fatehpur Sikri', lat: 27.0945, lng: 77.6619 },
          { name: 'Mehtab Bagh', lat: 27.1833, lng: 78.0417 },
          { name: 'Itmad-ud-Daulah', lat: 27.2011, lng: 78.0283 },
        ],
      },
      'Vrindavan': {
        places: [
          { name: 'Prem Mandir', lat: 27.5806, lng: 77.7003 },
          { name: 'Banke Bihari Mandir', lat: 27.5764, lng: 77.6964 },
          { name: 'ISKCON Temple', lat: 27.5781, lng: 77.6992 },
          { name: 'Radha Raman Temple', lat: 27.5769, lng: 77.6969 },
          { name: 'Govind Dev Temple', lat: 27.5778, lng: 77.6978 },
        ],
      },
      'Varanasi': {
        places: [
          { name: 'Kashi Vishwanath Temple', lat: 25.3176, lng: 83.0058 },
          { name: 'Dashashwamedh Ghat', lat: 25.2907, lng: 83.0097 },
          { name: 'Assi Ghat', lat: 25.2811, lng: 83.0103 },
          { name: 'Manikarnika Ghat', lat: 25.3103, lng: 83.0106 },
          { name: 'Sarnath', lat: 25.3808, lng: 83.0214 },
        ],
      },
      'Prayagraj': {
        places: [
          { name: 'Triveni Sangam', lat: 25.4300, lng: 81.8800 },
          { name: 'Allahabad Fort', lat: 25.4306, lng: 81.8731 },
          { name: 'Anand Bhavan', lat: 25.4500, lng: 81.8500 },
          { name: 'Khusro Bagh', lat: 25.4508, lng: 81.8486 },
          { name: 'Allahabad Museum', lat: 25.4481, lng: 81.8469 },
        ],
      },
      'Mathura': {
        places: [
          { name: 'Shri Krishna Janmabhoomi', lat: 27.5035, lng: 77.6722 },
          { name: 'Dwarkadhish Temple', lat: 27.5019, lng: 77.6736 },
          { name: 'Vishram Ghat', lat: 27.5000, lng: 77.6800 },
        ],
      },
      'Ayodhya': {
        places: [
          { name: 'Ram Janmabhoomi', lat: 26.7950, lng: 82.1944 },
          { name: 'Hanuman Garhi', lat: 26.7944, lng: 82.1950 },
          { name: 'Kanak Bhavan', lat: 26.7947, lng: 82.1947 },
        ],
      },
    },
  },
  'Rajasthan': {
    cities: {
      'Jaipur': {
        places: [
          { name: 'Hawa Mahal', lat: 26.9239, lng: 75.8267 },
          { name: 'City Palace', lat: 26.9258, lng: 75.8236 },
          { name: 'Amber Fort', lat: 27.1736, lng: 75.8512 },
          { name: 'Jantar Mantar', lat: 26.9247, lng: 75.8246 },
        ],
      },
      'Udaipur': {
        places: [
          { name: 'City Palace', lat: 24.5760, lng: 73.6833 },
          { name: 'Lake Pichola', lat: 24.5714, lng: 73.6842 },
          { name: 'Jagdish Temple', lat: 24.5744, lng: 73.6831 },
        ],
      },
    },
  },
  'Maharashtra': {
    cities: {
      'Mumbai': {
        places: [
          { name: 'Gateway of India', lat: 18.9220, lng: 72.8347 },
          { name: 'Marine Drive', lat: 18.9441, lng: 72.8260 },
          { name: 'Juhu Beach', lat: 19.0960, lng: 72.8260 },
        ],
      },
    },
  },
};

// Helper function to get all states
export const getStates = () => Object.keys(locationData);

// Helper function to get cities for a state
export const getCities = (state) => {
  if (!state || !locationData[state]) return [];
  return Object.keys(locationData[state].cities);
};

// Helper function to get places for a city in a state
export const getPlaces = (state, city) => {
  if (!state || !city || !locationData[state]?.cities[city]) return [];
  return locationData[state].cities[city].places;
};

// Helper function to format full address
export const formatAddress = (state, city, placeName) => {
  return `${placeName}, ${city}, ${state}`;
};

