#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

const api = axios.create({ baseURL: BASE_URL });

async function test() {
  try {
    // 1. Register a test driver
    console.log('\n1️⃣ Registering test driver...');
    const driverReg = await api.post('/api/auth/register', {
      name: 'Test Driver ' + Date.now(),
      email: 'driver' + Date.now() + '@test.com',
      password: 'password123',
      phone: '9999999999',
      role: 'driver',
    });
    console.log('✅ Driver registered:', driverReg.data.user._id);
    const driverToken = driverReg.data.token;

    // 2. Register a test host
    console.log('\n2️⃣ Registering test host...');
    const hostReg = await api.post('/api/auth/register', {
      name: 'Test Host ' + Date.now(),
      email: 'host' + Date.now() + '@test.com',
      password: 'password123',
      phone: '8888888888',
      role: 'host',
    });
    console.log('✅ Host registered:', hostReg.data.user._id);
    const hostToken = hostReg.data.token;

    // 3. Try to fetch driver bookings (should be empty initially)
    console.log('\n3️⃣ Fetching driver bookings...');
    const driverBookingsResponse = await api.get('/api/bookings/driver', {
      headers: { Authorization: `Bearer ${driverToken}` },
    });
    console.log('✅ Driver bookings fetched:', driverBookingsResponse.data.length);

    // 4. Try to fetch host bookings (should be empty initially)
    console.log('\n4️⃣ Fetching host bookings...');
    const hostBookingsResponse = await api.get('/api/bookings/host', {
      headers: { Authorization: `Bearer ${hostToken}` },
    });
    console.log('✅ Host bookings fetched:', hostBookingsResponse.data.length);

    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    process.exit(1);
  }
}

test();
