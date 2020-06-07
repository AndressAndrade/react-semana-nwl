import knex from '../database/connection';

class ItemsController {

    

    // Listagem de items
    async index(req, res) {

        const items = await knex('items').select('*');
    
        const serializedItems = items.map(item => {
            return {
                id: item.id,
                title: item.title,
                image_url: `http://localhost:3333/uploads/${item.image}`
            };
        });
    
        res.status(200).json({
            serializedItems
        });
    
    }
    
}

export default ItemsController;