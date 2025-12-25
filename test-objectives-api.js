const io = require('socket.io-client');

const socket = io('http://localhost:3001', {
  transports: ['websocket']
});

let roomCode = null;

socket.on('connect', () => {
  console.log('Connected to WebSocket server');
  
  // Create a room
  console.log('\n=== Creating room ===');
  socket.emit('create_room', {
    playerName: 'TestPlayer',
    playerId: 'test-player-' + Date.now()
  });
});

socket.on('room_created', (data) => {
  console.log('\n=== Room created ===');
  console.log('Room code:', data.roomCode);
  roomCode = data.roomCode;
  
  // Select character
  console.log('\n=== Selecting character ===');
  socket.emit('select_character', {
    roomCode: roomCode,
    characterClass: 'brute'
  });
  
  setTimeout(() => {
    // Select scenario
    console.log('\n=== Selecting scenario ===');
    socket.emit('select_scenario', {
      roomCode: roomCode,
      scenarioId: 1 // Black Barrow or first scenario
    });
  }, 1000);
  
  setTimeout(() => {
    // Start game
    console.log('\n=== Starting game ===');
    socket.emit('start_game', {
      roomCode: roomCode
    });
  }, 2000);
});

socket.on('game_started', (data) => {
  console.log('\n=== Game started event received ===');
  console.log('Objectives from backend:', JSON.stringify(data.objectives, null, 2));
  
  if (data.objectives && data.objectives.primary) {
    const primary = data.objectives.primary;
    console.log('\n=== Checking primary objective ===');
    console.log('Has id:', !!primary.id);
    console.log('Has description:', !!primary.description);
    console.log('Has trackProgress:', !!primary.trackProgress);
    console.log('Has type (SHOULD BE FALSE):', !!primary.type);
    console.log('Has milestones (SHOULD BE FALSE):', !!primary.milestones);
    
    if (primary.type || primary.milestones) {
      console.log('\n ERROR: Unsanitized fields detected!');
      console.log('This will cause React child error!');
    } else {
      console.log('\n SUCCESS: Objectives properly sanitized!');
    }
  }
  
  process.exit(0);
});

socket.on('error', (error) => {
  console.error('Socket error:', error);
  process.exit(1);
});

setTimeout(() => {
  console.log('Test timeout - exiting');
  process.exit(1);
}, 15000);
