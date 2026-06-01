const FormData = require('form-data');
const xlsx = require('xlsx');

async function run() {
  try {
    // 1. Login to get token
    const loginRes = await fetch('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('Login successful');

    // 2. Fetch active events to get an eventId
    const eventsRes = await fetch('http://localhost:5001/api/events', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const eventsData = await eventsRes.json();
    const eventId = eventsData.events[0]?.id;
    if (!eventId) throw new Error('No events found');
    console.log('Using eventId:', eventId);

    // 3. Create dummy excel file
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet([{ Name: 'Test', Roll: '123' }]);
    xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // 4. Upload
    const fd = new FormData();
    fd.append('file', buffer, 'test.xlsx');
    fd.append('mapping', JSON.stringify({ name: 'Name', roll: 'Roll' }));
    fd.append('eventName', 'Test Event');
    fd.append('eventId', eventId);

    console.log('Uploading...');
    const uploadRes = await fetch('http://localhost:5001/api/attendees/upload-excel', {
      method: 'POST',
      headers: {
        ...fd.getHeaders(),
        Authorization: `Bearer ${token}`
      },
      body: fd
    });

    if (!uploadRes.ok) {
      const errorText = await uploadRes.text();
      console.error('Upload failed with status', uploadRes.status);
      console.error('Error Response:', errorText);
      return;
    }

    const bufferResponse = await uploadRes.arrayBuffer();
    console.log('Upload successful! Buffer length:', bufferResponse.byteLength);
  } catch (error) {
    console.error('Error:', error);
  }
}

run();
