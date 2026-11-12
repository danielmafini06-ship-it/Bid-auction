const express = require('express');
const loteController = require('../controllers/loteController');

const router = express.Router();

// Rota POST para criar um novo lote
router.post('/', loteController.create);

module.exports = router;