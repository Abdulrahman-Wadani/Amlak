import BaseClass from './Baseclass.js';

export class role extends BaseClass {
    static modelName = 'role';
    static fields = ['name', 'description',"users"];

    constructor(data = {}) {
        super(data);
        this.name = data.name ?? null;
        this.description = data.description ?? null;
        this.users = data.users ?? [];
    }
}
