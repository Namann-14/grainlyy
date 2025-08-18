// Simple test to call the assignment API
async function testAssignment() {
  try {
    const response = await fetch('http://localhost:3000/api/admin?endpoint=assign-delivery-agent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deliveryAgentAddress: '0xf5BB544eF61E21d644341c3729129fB94A6A2E94',
        shopkeeperAddress: '0x6E588051bb1506eEeA9B96d6fFD46727205d9600'
      })
    });

    const result = await response.json();
    console.log('Response:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

testAssignment();
