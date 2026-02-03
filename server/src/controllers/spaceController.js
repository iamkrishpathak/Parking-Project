const Space = require('../models/Space');
const Booking = require('../models/Booking');
const { geocodeAddress } = require('../utils/geoCoder');

exports.createSpace = async (req, res) => {
  try {
    const { address, pricePerHour, availability = [], photos = [] } = req.body;

    if (!address || !pricePerHour) {
      return res.status(400).json({ message: 'Address and price are required' });
    }

    // Note: Past date validation for availability slots is handled on the frontend
    // via the min attribute on datetime-local inputs

    const geoResponse = await geocodeAddress(address);

    // Ensure coordinates are always within valid 2dsphere bounds
    let [lng, lat] = geoResponse.coordinates;
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ message: 'Invalid coordinates for this address' });
    }
    // Clamp just in case any mock geocoder returns out-of-range values
    lat = Math.max(-89.9, Math.min(89.9, lat));
    lng = Math.max(-179.9, Math.min(179.9, lng));

    const space = await Space.create({
      hostId: req.user._id,
      address,
      location: {
        type: 'Point',
        coordinates: [lng, lat],
      },
      photos: photos.length ? photos : undefined,
      pricePerHour,
      availability,
    });

    res.status(201).json(space);
  } catch (error) {
    console.error('Create space error', error.message);
    res.status(500).json({ message: 'Unable to create space' });
  }
};

exports.getHostedSpaces = async (req, res) => {
  try {
    const spaces = await Space.find({ hostId: req.user._id }).sort({ createdAt: -1 });
    res.json(spaces);
  } catch (error) {
    console.error('Fetch host spaces error', error.message);
    res.status(500).json({ message: 'Unable to load spaces' });
  }
};

exports.updatePrice = async (req, res) => {
  try {
    const { price } = req.body;
    const space = await Space.findById(req.params.id);
    if (!space) return res.status(404).json({ message: 'Space not found' });
    if (String(space.hostId) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    space.pricePerHour = Number(price);
    await space.save();
    res.json(space);
  } catch (error) {
    console.error('Update price error', error.message);
    res.status(500).json({ message: 'Unable to update price' });
  }
};

exports.searchSpaces = async (req, res) => {
  try {
    const { lat, lng, startTime, endTime } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ message: 'lat and lng query params required' });
    }

    const coordinates = [Number(lng), Number(lat)];
    const timeFilter =
      startTime && endTime
        ? {
            start: new Date(startTime),
            end: new Date(endTime),
          }
        : null;

    const spaces = await Space.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates,
          },
          $maxDistance: 5000,
        },
      },
    });

    if (!timeFilter) {
      return res.json(spaces);
    }

    const overlappingBookings = await Booking.find({
      spaceId: { $in: spaces.map((s) => s._id) },
      startTime: { $lt: timeFilter.end },
      endTime: { $gt: timeFilter.start },
    }).select('spaceId');

    const bookedSpaceIds = new Set(overlappingBookings.map((b) => b.spaceId.toString()));
    const availableSpaces = spaces.filter((space) => !bookedSpaceIds.has(space._id.toString()));

    res.json(availableSpaces);
  } catch (error) {
    console.error('Search spaces error', error.message);
    res.status(500).json({ message: 'Unable to search spaces' });
  }
};

