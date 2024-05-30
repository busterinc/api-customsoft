
const errorCatalog = [
    { code: 'ERR001', message: 'Error de autenticación: Credenciales inválidas.' },
    { code: 'ERR002', message: 'Error de autorización: Acceso denegado.' },
    { code: 'ERR003', message: 'Error interno del servidor: No se pudo completar la operación.' }
];

const logActions = [
    { code: 'ACT001', message: 'GENERA NUEVO TOKEN' },
    { code: 'ACT002', message: 'REGISTRO NUEVO USUARIO' },
    { code: 'ACT003', message: 'CARGA NUEVO DOCUMENTO' },
    { code: 'ACT004', message: 'ACTUALIZA DOCUMENTO' },
    { code: 'ACT005', message: 'ELIMINA DOCUMENTO' },
    { code: 'ACT006', message: 'INICIO SESIÓN' }
]

module.exports = { errorCatalog, logActions };