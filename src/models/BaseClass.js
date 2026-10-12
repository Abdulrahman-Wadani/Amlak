import { v4 as uuidv4 } from 'uuid';

export default class BaseClass {
    static modelName = null;
    static fields = [];

    constructor(data = {}) {
        this.id = uuidv4();
        this.created_at = new Date();
        this.updated_at = new Date();
        for (const f of this.constructor.fields) this[f] = data[f] ?? null;
    }
}
