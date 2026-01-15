/**
 * Script to check available sports in TheOddsAPI
 *
 * Usage:
 * 1. Set your API key below
 * 2. Run: node scripts/check-theodds-sports.js
 * 3. Look for horse racing sport keys in the output
 */

const API_KEY = 'YOUR_API_KEY_HERE'; // Replace with your actual key

async function checkAvailableSports() {
  try {
    console.log('Fetching available sports from TheOddsAPI...\n');

    const response = await fetch(
      `https://api.the-odds-api.com/v4/sports/?apiKey=${API_KEY}`
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Error:', error);
      return;
    }

    const sports = await response.json();

    console.log(`Found ${sports.length} sports:\n`);

    // Look for horse racing
    console.log('=== HORSE RACING SPORTS ===');
    const racingSports = sports.filter(s =>
      s.key.includes('horse') ||
      s.key.includes('racing') ||
      s.title.toLowerCase().includes('horse') ||
      s.title.toLowerCase().includes('racing')
    );

    if (racingSports.length > 0) {
      racingSports.forEach(sport => {
        console.log(`✓ ${sport.title}`);
        console.log(`  Key: ${sport.key}`);
        console.log(`  Group: ${sport.group}`);
        console.log(`  Active: ${sport.active ? 'Yes' : 'No'}`);
        console.log('');
      });
    } else {
      console.log('❌ No horse racing sports found in your API account.');
      console.log('You may need to:');
      console.log('  1. Upgrade your API plan to include horse racing');
      console.log('  2. Or contact TheOddsAPI support to enable it\n');
    }

    // Show all available sports
    console.log('=== ALL AVAILABLE SPORTS ===');
    sports.forEach(sport => {
      console.log(`- ${sport.key} (${sport.title})`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkAvailableSports();
