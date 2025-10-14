// 🔧 IMMEDIATE AUTHENTICATION FIX
// Copy and paste this entire script into your browser console on http://localhost:3000

console.log('🔧 Starting authentication fix...');

// Correct authentication data
const correctToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWZ5aTZybW0wMDAwanA0eXY5cjRucThjIiwiZW1haWwiOiJrYXJsQGVtYWlsLmNvbSIsInVzZXJuYW1lIjoia2FybCIsImlhdCI6MTc1ODc0OTc0MywiZXhwIjoxNzU5MzU0NTQzfQ.2Q3vFE250O6shvjjlDuF9mRHPZW_7du5xzLXsBUmGDM";
const correctUser = {
    "id": "cmfyi6rmm0000jp4yv9r4nq8c",
    "email": "karl@email.com",
    "username": "karl",
    "name": "Karl Test User"
};

// Clear ALL possible auth keys
console.log('🧹 Clearing old authentication data...');
const keysToRemove = [
    'auth_token', 'auth_user', 'token', 'user', 
    'access_token', 'refresh_token', 'jwt_token',
    'authToken', 'authUser', 'userToken', 'userData',
    'auth', 'userData', 'session', 'login'
];

keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
});

// Set correct data
console.log('🔑 Setting correct authentication...');
localStorage.setItem('auth_token', correctToken);
localStorage.setItem('auth_user', JSON.stringify(correctUser));
sessionStorage.setItem('auth_token', correctToken);
sessionStorage.setItem('auth_user', JSON.stringify(correctUser));

// Verify
const storedToken = localStorage.getItem('auth_token');
const storedUser = JSON.parse(localStorage.getItem('auth_user') || '{}');

if (storedToken === correctToken && storedUser.id === correctUser.id) {
    console.log('✅ AUTHENTICATION FIXED SUCCESSFULLY!');
    console.log('Old User ID: cmfxfsg530000jpvtkb1aawyv (INVALID)');
    console.log('New User ID:', storedUser.id, '(VALID)');
    console.log('Username:', storedUser.username);
    console.log('Email:', storedUser.email);
    console.log('🎉 Now try creating a hangout!');
    
    // Show success message
    alert('✅ Authentication fixed! You can now create hangouts. Please refresh the page.');
} else {
    console.log('❌ Authentication verification failed');
    alert('❌ Authentication fix failed. Please try again.');
}



















