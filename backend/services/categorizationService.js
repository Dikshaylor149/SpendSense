const Transaction = require('../models/Transaction');

// Curated keyword dictionary for Indian merchants & expense taxonomy
const KEYWORD_RULES = {
  EMI: [
    'emi', 'installment', 'loan', 'mortgage', 'bajaj finserv', 
    'home credit', 'kreditbee', 'lazypay', 'simpl', 'slice', 'uni card'
  ],
  Subscriptions: [
    // OTT & Digital Platforms
    'netflix', 'prime', 'amazon prime', 'zee5', 'zee 5', 'sonyliv', 'sony liv', 
    'hotstar', 'jiocinema', 'jio cinema', 'aha', 'hoichoi', 'mubi', 'crunchyroll', 
    'discovery plus', 'lionsgate', 'spotify', 'gaana', 'wynk', 'jiosaavn', 
    'apple music', 'youtube', 'icloud', 'google one', 'chatgpt', 'midjourney', 
    'canva', 'notion', 'github', 'audible', 'kindle', 'subscription', 'membership',
    // Fitness, Sports & Learning Classes
    'gym', 'cultfit', 'cult fit', 'gold gym', 'anytime fitness', 'swimming', 
    'yoga', 'pilates', 'zumba', 'dance', 'boxing', 'mma', 'badminton', 
    'tennis', 'coaching', 'tuition', 'class', 'classes', 'course', 'udemy', 
    'coursera', 'duolingo', 'skillshare',
    // Telecom, Recharges & Fiber/Broadband
    'recharge', 'jio', 'airtel', 'vi', 'vodafone', 'bsnl', 'act fibernet', 
    'hathway', 'excitel', 'tata play', 'tatasky', 'dish tv', 'd2h', 'sun direct', 
    'broadband', 'fiber', 'fibernet', 'wifi', 'postpaid', 'prepaid', 'dth'
  ],
  Entertainment: [
    // Movies, Standups, Concerts & Live Shows
    'bookmyshow', 'paytm insider', 'zomato live', 'pvr', 'inox', 'cinepolis', 
    'miraj cinemas', 'cinema', 'movie', 'movies', 'theater', 'theatre', 'imax', 
    'concert', 'gig', 'festival', 'nh7', 'lollapalooza', 'sunburn', 'standup', 
    'stand up', 'comedy', 'comic', 'show', 'improv', 'open mic', 'circus', 
    'magic show', 'play', 'drama',
    // Amusement Parks, Arcades & Recreation
    'amusement', 'theme park', 'water park', 'wonderla', 'imagicaa', 'esselworld', 
    'nicco park', 'ramoji', 'worlds of wonder', 'aquatica', 'snow world', 
    'bowling', 'smaash', 'smaaash', 'timezone', 'arcade', 'go karting', 'karting', 
    'paintball', 'trampoline', 'skyjumper', 'laser tag', 'escape room', 'museum', 
    'zoo', 'safari', 'aquarium', 'steam', 'playstation', 'xbox', 'nintendo', 
    'valorant', 'bgmi', 'gaming'
  ],
  Utilities: [
    'electricity', 'power', 'water', 'sewage', 'gas', 'lpg', 'indane', 
    'bharat gas', 'hp gas', 'mahanagar gas', 'igl', 'adani gas', 'gail', 
    'bescom', 'tata power', 'adani electricity', 'jvvnl', 'avvnl', 'jdvvnl', 
    'mseb', 'mahavitaran', 'torrent power', 'cesc', 'tneb', 'uppcl', 'bses', 
    'bill', 'maintenance', 'society', 'municipal', 'property tax', 'water tanker'
  ],
  Food: [
    'swiggy', 'zomato', 'eatsure', 'magicpin', 'restaurant', 'cafe', 'coffee', 
    'starbucks', 'blue tokai', 'third wave', 'tim hortons', 'ccd', 'chaayos', 
    'mcdonalds', 'dominos', 'pizza hut', 'kfc', 'burger king', 'wendys', 
    'subway', 'haldiram', 'bikanervala', 'barbeque nation', 'wow momo', 
    'faasos', 'behrouz', 'ovenstory', 'theobroma', 'burger', 'pizza', 
    'bakery', 'dining', 'dhaba', 'bistro', 'canteen', 'mess', 'eat'
  ],
  Groceries: [
    'blinkit', 'zepto', 'instamart', 'bigbasket', 'bbnow', 'jiomart', 
    'reliance smart', 'smart bazaar', 'dmart', 'd mart', 'more supermarket', 
    'spencers', 'nature basket', 'star bazaar', 'ratnadeep', 'supermarket', 
    'hypermarket', 'grocery', 'groceries', 'kirana', 'dairy', 'amul', 
    'mother dairy', 'country delight', 'milk', 'vegetables', 'fruits', 'meat', 
    'licious', 'freshtohome', 'mart'
  ],
  Transport: [
    'uber', 'ola', 'rapido', 'namma yatri', 'blusmart', 'inDrive', 'indigo', 
    'air india', 'vistara', 'spicejet', 'akasa', 'irctc', 'redbus', 'abhibus', 
    'zingbus', 'metro', 'dmrc', 'bmrc', 'local train', 'uts', 'petrol', 'diesel', 
    'cng', 'fuel', 'shell', 'hpcl', 'bpcl', 'indian oil', 'nayara', 'jio bp', 
    'fastag', 'toll', 'parking', 'cab', 'auto', 'taxi', 'train', 'flight', 'bus'
  ]
};

// Helper to escape special regex characters safely
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Automatically predicts the category of a transaction based on merchant name.
 * Tier 1: Historical MongoDB lookup (exact merchant match)
 * Tier 2: Word-boundary Regex Tokenization (\b)
 * Tier 3: Fallback to 'Other'
 */
const predictCategory = async (merchantName) => {
  if (!merchantName) return 'Other';
  const cleanMerchant = merchantName.trim().toLowerCase();

  try {
    // Tier 1: Check historical transactions in MongoDB (Case-insensitive exact match)
    const previousTx = await Transaction.findOne({
      merchant: { $regex: `^${escapeRegex(cleanMerchant)}$`, $options: 'i' }
    }).sort({ date: -1 });

    if (previousTx && previousTx.category) {
      return previousTx.category;
    }
  } catch (err) {
    console.error("Historical lookup error:", err);
  }

  // Tier 2: Check against keyword dictionary using strict word boundaries (\b)
  for (const [category, keywords] of Object.entries(KEYWORD_RULES)) {
    const isMatch = keywords.some(keyword => {
      const pattern = new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'i');
      return pattern.test(cleanMerchant);
    });

    if (isMatch) {
      return category;
    }
  }

  // Tier 3: Default fallback
  return 'Other';
};

module.exports = { predictCategory };