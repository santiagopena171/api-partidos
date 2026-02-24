const handler = require('./api/matches');

const req = { method: 'GET' };
const res = {
    setHeader: () => { },
    status: (code) => {
        console.log('STATUS:', code);
        return {
            json: (data) => console.log('JSON:', JSON.stringify(data, null, 2)),
            end: () => console.log('END')
        };
    }
};

handler(req, res).catch(console.error);
