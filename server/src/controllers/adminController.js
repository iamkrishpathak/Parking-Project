const User = require('../models/User');
const ParkingSpace = require('../models/Space');

// Get all pending verifications
exports.getPendingVerifications = async (req, res) => {
  try {
    const pendingUsers = await User.find({ 
      role: 'host',
      $or: [
        { kycStatus: 'pending' },
        { 'kycDocuments.status': 'pending' }
      ]
    }).select('-password -__v');

    res.status(200).json(pendingUsers);
  } catch (error) {
    console.error('Error fetching pending verifications:', error);
    res.status(500).json({ message: 'Error fetching pending verifications' });
  }
};

// Verify user KYC
exports.verifyUserKYC = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, reason } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be either "approved" or "rejected"' });
    }

    const update = { 
      kycStatus: status,
      isVerified: status === 'approved',
      verificationNotes: status === 'rejected' ? reason : undefined
    };

    const user = await User.findByIdAndUpdate(
      userId,
      update,
      { new: true }
    ).select('-password -__v');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      message: `User KYC ${status} successfully`,
      user
    });
  } catch (error) {
    console.error('Error verifying user KYC:', error);
    res.status(500).json({ message: 'Error verifying user KYC' });
  }
};

// Get all parking spaces for approval
exports.getPendingParkingSpaces = async (req, res) => {
  try {
    const pendingSpaces = await ParkingSpace.find({ 
      status: 'pending' 
    }).populate('owner', 'name email phone');

    res.status(200).json(pendingSpaces);
  } catch (error) {
    console.error('Error fetching pending parking spaces:', error);
    res.status(500).json({ message: 'Error fetching pending parking spaces' });
  }
};

// Approve/Reject parking space
exports.reviewParkingSpace = async (req, res) => {
  try {
    const { spaceId } = req.params;
    const { status, reason } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be either "approved" or "rejected"' });
    }

    const update = { 
      status,
      adminNotes: status === 'rejected' ? reason : undefined,
      reviewedAt: new Date()
    };

    const parkingSpace = await ParkingSpace.findByIdAndUpdate(
      spaceId,
      update,
      { new: true }
    ).populate('owner', 'name email phone');

    if (!parkingSpace) {
      return res.status(404).json({ message: 'Parking space not found' });
    }

    res.status(200).json({
      message: `Parking space ${status} successfully`,
      parkingSpace
    });
  } catch (error) {
    console.error('Error reviewing parking space:', error);
    res.status(500).json({ message: 'Error reviewing parking space' });
  }
};

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const { role } = req.query;
    const filter = role ? { role } : {};
    
    const users = await User.find(filter)
      .select('-password -__v')
      .sort({ createdAt: -1 });

    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
};

// Get all parking spaces
exports.getAllParkingSpaces = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    
    const parkingSpaces = await ParkingSpace.find(filter)
      .populate('owner', 'name email phone')
      .sort({ createdAt: -1 });

    res.status(200).json(parkingSpaces);
  } catch (error) {
    console.error('Error fetching parking spaces:', error);
    res.status(500).json({ message: 'Error fetching parking spaces' });
  }
};
