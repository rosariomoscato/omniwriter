const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');

const db = new Database('/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db');

try {
  const marketplaceItemId = '0f56fd6f-79c2-4b5a-980d-1ba42c326421';
  const userId = 'af40b682-64f6-477c-bcdd-e7fddc5c2bd4';
  const rating = 5;
  const text = 'Excellent novel!';

  // Check if the marketplace item exists
  const item = db.prepare(
    'SELECT id, user_id FROM marketplace_items WHERE id = ? AND is_visible = 1'
  ).get(marketplaceItemId);

  console.log('Item found:', !!item);
  if (item) {
    console.log('Item user_id:', item.user_id);
    console.log('Review user_id:', userId);
    console.log('Cannot review own work:', item.user_id === userId);
  }

  // Cannot review own work
  if (item && item.user_id === userId) {
    console.log('ERROR: Cannot review own work');
  }

  // Check for existing review by this user
  const existingReview = db.prepare(
    'SELECT id FROM marketplace_reviews WHERE marketplace_item_id = ? AND user_id = ?'
  ).get(marketplaceItemId, userId);

  console.log('Existing review:', !!existingReview);

  const reviewId = uuidv4();
  db.prepare(
    'INSERT INTO marketplace_reviews (id, marketplace_item_id, user_id, rating, review_text, created_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\'))'
  ).run(reviewId, marketplaceItemId, userId, rating, text || '');

  console.log('Review created with id:', reviewId);

  // Update average rating and review count
  const ratingStats = db.prepare(
    'SELECT AVG(rating) as avg_rating, COUNT(*) as review_count FROM marketplace_reviews WHERE marketplace_item_id = ?'
  ).get(marketplaceItemId);

  console.log('Rating stats:', ratingStats);

  db.prepare(
    'UPDATE marketplace_items SET average_rating = ?, review_count = ? WHERE id = ?'
  ).run(
    Math.round((ratingStats.avg_rating || 0) * 100) / 100,
    ratingStats.review_count,
    marketplaceItemId
  );

  console.log('Marketplace item updated');

  const review = db.prepare('SELECT * FROM marketplace_reviews WHERE id = ?').get(reviewId);
  console.log('Review:', !!review);

} catch (error) {
  console.error('Error:', error);
}

db.close();
