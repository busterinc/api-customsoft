const express = require('express');
const multer = require('multer');
require('dotenv').config();
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const { verifyToken } = require('./auth');
const { activityTrace } = require('./log');
const { logActions } = require('./catalog/matrix');

const router = express.Router();
router.use(express.json());

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const XLSX = require('xlsx');
const { PassThrough } = require('stream');


// Configuración de Supabase
console.log('process.env.SUPABASE_URL..............', process.env.SUPABASE_URL)
console.log('process.env.SUPABASE_KEY..............', process.env.SUPABASE_KEY)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Endpoint para registrar usuarios
router.post('/token', async (req, res) => {
    try {
        console.log('req.body..............', req.body)
        const { email, password } = req.body;
        console.log('email..............', email)
        console.log('password..............', password)
        // const { data, error } = await supabase.auth.signUp({ email, password });
        const { data: users, error } = await supabase
            .from('super_users')
            .select("*")
            .like('email', email)
            .eq('password', password)
            .single()
        console.log('users..............', users)
        console.log('error..............', error)

        if (error) throw error
        if (!users) return res.status(401).json({
            error: 'Correo electrónico no encontrado o la contraseña no es válida'
        })

        console.log('users..............', users)

        // Generar el token JWT si la autenticación es exitosa
        const secretKey = crypto.randomBytes(32).toString('hex');
        console.log('secretKey..............', secretKey)
        const token = users ? await jwt.sign({ userId: users.id }, secretKey, { expiresIn: '1h' }) : null
        console.log('token..............', token)

        if (token && secretKey) {
            const { data, error } = await supabase
                .from('super_users')
                .update({ token: token, secret: secretKey })
                .eq('email', email)
                .select()
            console.log('data..............', data)
            console.log('error..............', error)
        }

        res.status(201).json({
            message: 'Se generó token exitosamente',
            users,
            token
        });

        // (old, val, auth, error, act, fnc, resp)
        await activityTrace(null, users, email, error, logActions[0].code, 'post(/token)', token)
    } catch (error) {
        console.error('Error al generar token:', error.message);
        await activityTrace(null, null, req.body.email, error, logActions[0].code, 'post(/token)', null)
        res.status(404).json({
            error: 'Error al generar token ' + error.message
        });
    }
});

// Endpoint para iniciar sesión de usuarios
router.post('/login', verifyToken, async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('email..............', email)
        console.log('password..............', password)
        // const { user, session, error } = await supabase.auth.signIn({ email, password });
        let { data, error} = await supabase
            .from('users')
            .select("*")
            .like('email', email)
            .eq('password', password)
            .single()
        console.log('data..............', data)
        console.log('error..............', error)

        if (error) throw error
    
        res.status(data ? 200 : 201).json({
            message: data > 0 ? 'Inicio de sesión exitoso' : 'Email o Password incorrecto',
            data,
            error
        });
    } catch (error) {
        console.error('Error al iniciar sesión:', error.message);
        res.status(404).json({
            error: 'Error al iniciar sesión ' + error.message
        });
    }
  });

// Endpoint para iniciar sesión de usuarios
router.post('/singup', verifyToken, async (req, res) => {
    try {
        const { email, password, username } = req.body;
        console.log('email..............', email)
        console.log('password..............', password)
        console.log('username..............', username)

        let resp = ''
        if (email && password && username) {
            const { data, error } = await supabase
                .from('users')
                .insert([{
                    password: password,
                    email: email,
                    name: username
                }])
                .select()
            resp = data

            console.log('data..............', data)
            console.log('error..............', error)
        }
        res.status(200).json({
            message: 'Inicio de sesión exitoso',
            resp
        });
    } catch (error) {
        console.error('Error al iniciar sesión:', error.message);
        res.status(404).json({
            error: 'Error al iniciar sesión ' + error.message
        });
    }
});

const upload = multer({ dest: 'uploads/' });

// Endpoint para cargar archivos
router.post('/upload', verifyToken, upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        console.log('file..............', file)
        const { author } = req.body

        // Verificar si se proporcionaron todos los datos necesarios
        if (!author) throw new Error('Faltan parámetros requeridos');
    
        // Verificar si se cargó un archivo
        if (!file) throw new Error('No se proporcionó ningún archivo');
    
        // Leer el archivo cargado
        const fileData = fs.readFileSync(file.path);
        console.log('file.mimetype:::::::::::::::::::::::::::::::::::::::', file.mimetype)

        const contentType = await getContentType(file.mimetype);  
        console.log('contentType:::::::::::::::::::::::::::::::::::::::', contentType)
    
        // Subir el archivo a Supabase Storage
        const { data: uploadData, error: uploadError  } = await supabase.storage
            .from('raikou')
            .upload(file.filename, fileData, {
                // contentType: file.mimetyp ? file.mimetyp : contentType
                contentType: contentType ? contentType : file.mimetyp
            });
        console.log('uploadData................', uploadData)
        console.log('uploadError................', uploadError)

        if (uploadError) throw uploadError;
    
        const mimeType = file.originalname
        const partes = mimeType.split(".");
        const xt = partes[1];

        const urlBucket = process.env.BUCKET_URL + uploadData.path
        console.log('urlBucket................', urlBucket)

        // Guardar el registro en la tabla 'docs'
        const { data: respInsrt, error: respErr } = await supabase
            .from('docs')
            .insert([
            {
                bucket_url: urlBucket,
                xtension: xt,
                file_name: file.originalname,
                profile_id: author,
                size: file.size
            }
        ]);
        console.log('respInsrt................', respInsrt)
        console.log('respErr................', respErr)

        if (respErr) throw respErr
    
        // Eliminar el archivo temporal
        fs.unlinkSync(file.path);

        // (old, val, auth, error, act, fnc, resp)
        await activityTrace(null, respInsrt, author, respErr, logActions[2].code, 'post(/upload)', uploadData)
    
        res.status(201).json({
            message: 'Archivo cargado y registro guardado exitosamente',
            respInsrt,
            respErr,
            uploadData,
            uploadError
        });
    } catch (error) {
        console.error('Error al cargar archivo:', error.message);
        res.status(404).json({
            error: 'Error al cargar archivo ' + error.message
        });
    }
});

// Endpoint para ver el listado de documentos
router.get('/documents', verifyToken, async (req, res) => {
    try {
        console.log('req.query................', req.query)
        const author = req.query.profileId
        console.log('author................', author)

        // const { data, error } = await supabase.from('docs').select('*');
        const { data, error } = await supabase
            .from('docs')
            .select('*')
            .eq('profile_id', author)
        console.log('data................', data)
        console.log('error................', error)

        if (error) throw error

        res.status(data.length > 0 ? 200 : 201).json({
            data,
            message: data.length > 0 ? 'Se encontraron Documentos existentes' : 'El ProfileId proporcionado no tiene documentos'
        });
    } catch (error) {
        console.error('Error al obtener documentos:', error.message);
        res.status(404).json({ 
            error: 'Error al obtener documentos ' + error.message
        });
    }
});

// Endpoint para editar documentos
router.put('/documents/:id', verifyToken, upload.single('file'), async (req, res) => {
    try {
        const { id } = req.params;
        console.log('id---------------------', id)
        const file = req.file;
        console.log('file-------------------', file)

        console.log('req-------------------', req)

        // Verificar si se cargó un archivo
        if (!file) throw new Error('No se proporcionó ningún archivo');

        // Leer el archivo cargado
        const fileData = fs.readFileSync(file.path);
        console.log('file.mimetype:::::::::::::::::::::::::::::::::::::::', file.mimetype)

        const contentType = await getContentType(file.mimetype);  
        console.log('contentType:::::::::::::::::::::::::::::::::::::::', contentType)
    
        // Subir el archivo a Supabase Storage
        const { data: uploadData, error: uploadError  } = await supabase.storage
            .from('raikou')
            .upload(file.filename, fileData, {
                contentType: contentType ? contentType : file.mimetyp
            });
        console.log('uploadData------------------', uploadData)
        console.log('uploadError-----------------', uploadError)

        if (uploadError) throw uploadError;

        const mimeType = file.originalname
        const partes = mimeType.split(".");
        const xt = partes[1];

        const urlBucket = process.env.BUCKET_URL + uploadData.path
        console.log('urlBucket--------------', urlBucket)

        const currentDate = new Date().toISOString();
        // Formatear la fecha según el formato deseado "YYYY-MM-DDTHH:MM:SS.sssZ"
        const formattedDate = currentDate.slice(0, 23) + 'Z';
        console.log('formattedDate--------------', formattedDate)

        const { data, error } = await supabase
            .from('docs')
            .update({
                bucket_url: urlBucket,
                xtension: xt,
                file_name: file.originalname,
                size: file.size,
                created_at: formattedDate // Aquí se actualiza la fecha
            })
            .eq('id', id)
            .select()
        console.log('data---------------', data)
        console.log('error--------------', error)

        if (error) throw error

        // Eliminar el archivo temporal
        fs.unlinkSync(file.path);

        res.status(200).json({
            message: 'Documento actualizado exitosamente',
            data
        });
    } catch (error) {
        console.error('Error al editar documento:', error.message);
        res.status(404).json({
            error: 'Error al editar documento ' + error.message
        });
    }
});

// Endpoint para descargar informe
router.get('/download/:reportType', async (req, res) => {
    try {
        const { reportType } = req.params;
        console.log('reportType................', reportType)
        const query = reportType === 'log' ? 'activity_log' : 'docs'
        console.log('query................', query)

        // Consulta a la tabla activity_log
        const { data, error } = await supabase.from(query).select('*');
        console.log('data...............', data)

        if (error) throw error

        // Crear un libro de trabajo de Excel
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);

        // Agregar la hoja al libro de trabajo
        XLSX.utils.book_append_sheet(wb, ws, query);

        // Crear un flujo de lectura de datos para el archivo Excel
        const stream = new PassThrough();
        const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

        // Obtener la fecha actual
        const currentDate = new Date().toISOString().slice(0, 10); // Obtener la fecha en formato YYYY-MM-DD

        // Nombre del archivo con la fecha actual
        const filename = `${query}_${currentDate}.xlsx`;

        // Piping buffer data to stream
        stream.end(buffer);

        // Definir las cabeceras para la descarga del archivo
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        // Devolver el archivo Excel al cliente
        stream.pipe(res);
    } catch (error) {
      console.error('Error al eliminar documento:', error.message);
      res.status(404).json({
          error: 'Error al eliminar documento ' + error.message
      });
    }
});

// Endpoint para eliminar documentos
router.delete('/documents/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('id................', id)
    const { data, error } = await supabase
        .from('docs')
        .delete()
        .eq('id', id)
    console.log('data................', data)
    console.log('error................', error)

    // (old, val, auth, error, act, fnc, resp)
    await activityTrace(null, data, id, error, logActions[4].code, 'post(/documents/:id)', data)

    res.status(error ? 400 : 200).json({
        message: error ? 'Error: ' + error : 'Documento eliminado exitosamente',
        data 
    });
  } catch (error) {
    console.error('Error al eliminar documento:', error.message);
    res.status(404).json({
        error: 'Error al eliminar documento ' + error.message
    });
  }
});

router.get('/test', verifyToken, async (req, res) => {
    try {
        res.status(200).json('HOLA MUNDO');
    } catch (error) {
        console.error('Error testing:', error.message);
        res.status(404).json({
            error: 'Error testing: ' + error.message
        });
    }
});

// Endpoint para registrar SUPER USERS para generar tokens
router.post('/newSuperUser', verifyToken, async (req, res) => {
    try {
        console.log('req.body..............', req.body)
        const { email, password } = req.body;
        console.log('email..............', email)
        console.log('password..............', password)
        // const { data, error } = await supabase.auth.signUp({ email, password });
        let resp = ''
        if (email && password) {
            const { data, error } = await supabase
                .from('super_users')
                .insert([{
                    password: password,
                    email: email
                }])
                .select()
            resp = data

            console.log('data..............', data)
            console.log('error..............', error)
            if (error) throw error
        }
        res.status(201).json({
            message: 'Super Usuario registrado exitosamente',
            resp
        });
    } catch (error) {
        console.log('error..............', error)
        console.error('Error al registrar SUPER USERS:', error.message);
        res.status(404).json({
            error: 'Error al registrar SUPER USERS ' + error.message
        });
    }
});

module.exports = router;


async function getContentType (mimetype) {
    let contentType;

    try {
        switch (mimetype) {
            // Application
            case 'application/EDI-X12':
            case 'application/EDIFACT':
            case 'application/javascript':
            case 'application/octet-stream':
            case 'application/ogg':
            case 'application/pdf':
            case 'application/xhtml+xml':
            case 'application/x-shockwave-flash':
            case 'application/json':
            case 'application/ld+json':
            case 'application/xml':
            case 'application/zip':
            case 'application/x-www-form-urlencoded':
                contentType = mimetype;
                break;
    
            // Audio
            case 'audio/mpeg':
            case 'audio/x-ms-wma':
            case 'audio/vnd.rn-realaudio':
            case 'audio/x-wav':
                contentType = mimetype;
                break;
    
            // Image
            case 'image/gif':
            case 'image/jpeg':
            case 'image/png':
            case 'image/tiff':
            case 'image/vnd.microsoft.icon':
            case 'image/x-icon':
            case 'image/vnd.djvu':
            case 'image/svg+xml':
                contentType = mimetype;
                break;
    
            // Multipart
            case 'multipart/mixed':
            case 'multipart/alternative':
            case 'multipart/related':
            case 'multipart/form-data':
                contentType = mimetype;
                break;
    
            // Text
            case 'text/css':
            case 'text/csv':
            case 'text/html':
            case 'text/javascript':
            case 'text/plain':
            case 'text/xml':
                contentType = mimetype;
                break;
    
            // Video
            case 'video/mpeg':
            case 'video/mp4':
            case 'video/quicktime':
            case 'video/x-ms-wmv':
            case 'video/x-msvideo':
            case 'video/x-flv':
            case 'video/webm':
                contentType = mimetype;
                break;
    
            // VND
            case 'application/vnd.oasis.opendocument.text':
            case 'application/vnd.oasis.opendocument.spreadsheet':
            case 'application/vnd.oasis.opendocument.presentation':
            case 'application/vnd.oasis.opendocument.graphics':
            case 'application/vnd.ms-excel':
            case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
            case 'application/vnd.ms-powerpoint':
            case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
            case 'application/msword':
            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
            case 'application/vnd.mozilla.xul+xml':
                contentType = mimetype;
                break;
    
            default:
                contentType = 'application/octet-stream'; // Tipo de contenido genérico
                break;
        }
    } catch (error) {
        console.log('ERROR:: ', error)
        return error
    }
    console.log('contentType °°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°', contentType)

    return contentType
}