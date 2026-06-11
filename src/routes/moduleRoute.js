const express = require('express');
const { createModule, getModules, getModuleById, updateModule, deleteModule } = require('../controllers/moduleController');

const router = express.Router();

router.post('/', createModule);
router.get('/', getModules);
router.get('/:moduleId', getModuleById);
router.put('/:moduleId', updateModule);
router.delete('/:moduleId', deleteModule);

module.exports = router;
