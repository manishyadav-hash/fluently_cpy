const express = require('express');
const { createModule, getModules, updateModule, deleteModule } = require('../controllers/moduleController');

const router = express.Router();

router.post('/', createModule);
router.get('/', getModules);
router.put('/:moduleId', updateModule);
router.delete('/:moduleId', deleteModule);

module.exports = router;