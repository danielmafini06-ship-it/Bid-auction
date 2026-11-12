const createLoteUseCase = require('../usecases/createLoteUseCase');

class LoteController {
    async create(req, res) {
        try {
            const novoLote = await createLoteUseCase.execute(req.body);
            res.status(201).json({ message: "Lote criado com sucesso!", lote: novoLote });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
}

module.exports = new LoteController();