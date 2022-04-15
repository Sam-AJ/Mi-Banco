const { Pool } = require('pg');
const yargs = require('yargs');

const config = {
    user: "postgres",
    host: "localhost",
    password: "postgresql",
    database: 'banco',
    port: 5432
};

const pool = new Pool(config);

yargs.command("registrar", "Registrar nueva transferencia",{ 
    descripcion:{
        describe: 'Descripción de la transferencia',
        demand: true,
        alias: 'd'
    },
    monto:{
        describe: 'Monto a transferir',
        demand: true,
        alias: 'm'
    },
    cuenta_origen:{
        describe: 'Cuenta que envía el monto',
        demand: true,
        alias: 'co'
    },
    cuenta_destino:{
        describe: 'Cuenta que recibe el monto',
        demand: true,
        alias: 'cd'
    }
}, async (argumentos) => { //Función asíncrona que registre una nueva transferencia utilizando una transacción SQL.
    let { descripcion, monto, cuenta_origen, cuenta_destino } = argumentos;
    try {
        await pool.query("BEGIN");

        const descontar = {
            text: "UPDATE cuentas SET saldo = saldo - $1 WHERE id = $2 RETURNING *",
            values: [monto, cuenta_origen]
        }
        const resDescontar = await pool.query(descontar);

        const acreditar = {
            text: "UPDATE cuentas SET saldo = saldo + $1 WHERE id = $2 RETURNING *",
            values: [monto, cuenta_destino]
        }
        const resAcreditar = await pool.query(acreditar);

        const nuevaTransferencia = {
            text: "INSERT INTO transferencias (descripcion, fecha, monto, cuenta_origen, cuenta_destino) values ($1, CURRENT_TIMESTAMP, $2, $3, $4) RETURNING *",
            values: [descripcion, monto, cuenta_origen, cuenta_destino]
        }
        const resNuevaTransferencia = await pool.query(nuevaTransferencia);
        console.table(resNuevaTransferencia.rows); //Mostrar por consola la última transferencia registrada.

        await pool.query("COMMIT"); 
    } catch (error) {
        await pool.query("ROLLBACK");
        console.log(`Código de error: ${error.code}`);
        console.log(`Detalle del error: ${error.detail}`);
        console.log(`Tabla originaria del error: ${error.table}`);
        console.log(`Restricción violada en el campo: ${error.constraint}`);
    }
}).command("transferencias", "Consultar las 10 últimas transferencias", 
async () => { //Función asíncrona que consulte la tabla de transferencias y retorne los últimos 10 registros.
    try {
        let sql = "SELECT * FROM transferencias ORDER BY fecha DESC LIMIT 10";
        let respuesta = await pool.query(sql);
        console.table(respuesta.rows);
    } catch (error) {
        console.log(`Código de error: ${error.code}`);
        console.log(`Detalle del error: ${error.detail}`);
    }
    
}).command("saldo", "Consultar saldo de una cuenta",{
    id:{
        describe: 'Identificación única de la cuenta',
        demand: true,
        alias: 'i'
    }
}, async (argumentos) => { //Función asíncrona que consulte el saldo de una cuenta en específico.
    let id = argumentos.id;
    try {
        const saldoCuenta = {
            text: "SELECT saldo FROM cuentas WHERE id = $1",
            values: [id]
        }
        const resSaldoCuenta = await pool.query(saldoCuenta);
        console.table(resSaldoCuenta.rows);
    } catch (error) {
        console.log(`Código de error: ${error.code}`);
        console.log(`Detalle del error: ${error.detail}`);
    }
}).help().argv;