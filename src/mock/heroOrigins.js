import dotenv from 'dotenv';
dotenv.config();

const heroOrigins = [
    {
        origin: process.env.ORIGIN1,
        email: process.env.EMAIL1,
        password: process.env.PASSWORD1
    },
    {
        origin: process.env.ORIGIN2,
        email: process.env.EMAIL2,
        password: process.env.PASSWORD2
    },
    {
        origin: process.env.ORIGIN3,
        email: process.env.EMAIL3,
        password: process.env.PASSWORD3
    },
    {
        origin: process.env.ORIGIN4,
        email: process.env.EMAIL4,
        password: process.env.PASSWORD4
    },
    {
        origin: process.env.ORIGIN5,
        email: process.env.EMAIL5,
        password: process.env.PASSWORD5
    },
];

export { heroOrigins };
