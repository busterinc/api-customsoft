const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Función para verificar el token JWT
async function verifyToken(req, res, next) {
  const token = req.headers['authorization'];
  console.log('token: ', token);

  if (!token) {
    return res.status(403).json({ error: 'Token de autorización no proporcionado' });
  }

  let { data, error } = await supabase
    .from('super_users')
    .select("*")
    .eq('token', token)
    .single();
  console.log('data: ', data);
  console.log('error: ', error);

  console.log('data+++++++++++++', data)
  console.log('error+++++++++++++', error)

  if (error) throw error;

  if (!data) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  const secret = data.secret
  console.log('secret+++++++++++++', secret)

  jwt.verify(token, secret, (err, decoded) => {
    console.log('decoded: ', decoded);
    console.log('err: ', err);
    if (err) return res.status(401).json({ error: 'Token inválido' });
    req.user = decoded;
    next();
  });
}

module.exports = { verifyToken };