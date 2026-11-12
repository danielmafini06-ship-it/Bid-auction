const loteRepository = require('../repositories/loteRepository');

class CreateLoteUseCase {
    async execute(data) {
        if (!data.nome || data.lance_inicial === undefined) {
            throw new Error("O nome e o lance inicial são obrigatórios.");
        }
        
        if (data.lance_inicial <= 0) {
            throw new Error("O lance inicial deve ser maior que zero.");
        }

        // Se passar nas regras, manda o repositório salvar
        return await loteRepository.create(data);
    }
}

module.exports = new CreateLoteUseCase();