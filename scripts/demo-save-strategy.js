#!/usr/bin/env node

/**
 * Demo script showing the difference between the old and new save strategies
 */

console.log('=== DynamoDB Save Strategy Comparison ===\n');

// Simulate typing activity
const typingEvents = [
  { time: 0, action: 'type', text: 'H' },
  { time: 100, action: 'type', text: 'e' },
  { time: 200, action: 'type', text: 'l' },
  { time: 300, action: 'type', text: 'l' },
  { time: 400, action: 'type', text: 'o' },
  { time: 500, action: 'type', text: ' ' },
  { time: 600, action: 'type', text: 'w' },
  { time: 700, action: 'type', text: 'o' },
  { time: 800, action: 'type', text: 'r' },
  { time: 900, action: 'type', text: 'l' },
  { time: 1000, action: 'type', text: 'd' },
  { time: 5000, action: 'idle', text: '' }, // 5 second pause
  { time: 5100, action: 'type', text: '!' },
  { time: 30000, action: 'idle', text: '' }, // Long idle period
];

function simulateOldStrategy() {
  console.log('🔴 OLD STRATEGY (2s debounced onChange):');
  let dbWrites = 0;
  let lastSaveTime = -1;
  const DEBOUNCE_MS = 2000;

  typingEvents.forEach(event => {
    if (event.action === 'type') {
      // Reset debounce timer on every keystroke
      const shouldSave = (event.time - lastSaveTime) >= DEBOUNCE_MS;
      
      // Check if enough time has passed since last keystroke for debounce to trigger
      const nextEvent = typingEvents.find(e => e.time > event.time);
      const timeTillNext = nextEvent ? nextEvent.time - event.time : Infinity;
      
      if (timeTillNext >= DEBOUNCE_MS) {
        dbWrites++;
        lastSaveTime = event.time + DEBOUNCE_MS;
        console.log(`  ${event.time + DEBOUNCE_MS}ms: 💾 DB WRITE (after typing "${event.text}")`);
      }
    }
  });

  console.log(`  Total DB writes: ${dbWrites}\n`);
  return dbWrites;
}

function simulateNewStrategy() {
  console.log('🟢 NEW STRATEGY (25s idle-based saves):');
  let dbWrites = 0;
  let lastActivityTime = 0;
  let lastSaveContent = '';
  const IDLE_MS = 25000;

  // Find periods of inactivity
  for (let i = 0; i < typingEvents.length; i++) {
    const event = typingEvents[i];
    
    if (event.action === 'type') {
      lastActivityTime = event.time;
    }
    
    // Check for idle periods
    if (i < typingEvents.length - 1) {
      const nextEvent = typingEvents[i + 1];
      const idleTime = nextEvent.time - event.time;
      
      if (idleTime >= IDLE_MS) {
        dbWrites++;
        console.log(`  ${event.time + IDLE_MS}ms: 💾 DB WRITE (after ${IDLE_MS/1000}s idle)`);
      }
    }
  }

  // Final save after last activity
  const lastEvent = typingEvents[typingEvents.length - 1];
  if (lastEvent.time - lastActivityTime >= IDLE_MS) {
    dbWrites++;
    console.log(`  ${lastEvent.time}ms: 💾 DB WRITE (final idle save)`);
  }

  console.log(`  Total DB writes: ${dbWrites}\n`);
  return dbWrites;
}

function simulateAdditionalSaves() {
  console.log('📋 ADDITIONAL SAVE TRIGGERS (new strategy):');
  console.log('  - Editor blur: 💾 Manual save triggered');
  console.log('  - Page navigation: 💾 Manual save triggered'); 
  console.log('  - Ctrl+S pressed: 💾 Manual save triggered');
  console.log('  - Toolbar save button: 💾 Manual save triggered\n');
}

// Run simulation
const oldWrites = simulateOldStrategy();
const newWrites = simulateNewStrategy();
simulateAdditionalSaves();

// Summary
console.log('📊 SUMMARY:');
console.log(`  Old strategy: ${oldWrites} DB writes`);
console.log(`  New strategy: ${newWrites} DB writes`);
console.log(`  Reduction: ${Math.round((1 - newWrites/oldWrites) * 100)}%`);
console.log('');
console.log('💡 BENEFITS:');
console.log('  ✅ Massive reduction in DynamoDB writes');
console.log('  ✅ No more throttling errors');
console.log('  ✅ Real-time collaboration still works (Yjs)');
console.log('  ✅ Data safety via IndexedDB persistence');
console.log('  ✅ Manual save options for user control');
console.log('  ✅ Version guards prevent conflicts');