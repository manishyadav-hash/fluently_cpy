require('dotenv').config();

const app = require('./src/app');

const PORT = process.env.PORT || 5000;
console.log(process.env.DATABASE_URL);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
