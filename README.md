# 📁 API de File Manager

ℹ️ Esta API de File Manager está desarrollada utilizando Node.js y Express. Utiliza Supabase como base de datos y storage para almacenar archivos. Proporciona una interfaz para realizar operaciones básicas de gestión de archivos, como cargar, eliminar, actualizar y descargar archivos, así como funcionalidades adicionales como generar tokens de autenticación, inicio de sesión, etc.

## 🚀 Instalación

Para utilizar esta API, necesitarás tener instalado [Node.js](https://nodejs.org/) en tu sistema.

1. Clona este repositorio o descarga el código fuente.
2. Navega hasta el directorio del proyecto en tu terminal.
3. Ejecuta `npm install` para instalar las dependencias.
4. Configura las variables de entorno en un archivo `.env` basado en el ejemplo `.env.example`.
5. Ejecuta `npm start` para iniciar el servidor.

## 📋 Uso

### Endpoints Disponibles

- **POST /api/upload**: Carga un archivo al servidor.
- **DELETE /api/document/{id}**: Elimina el archivo con el ID especificado.
- **PUT /api/document/{id}**: Actualiza el archivo con el ID especificado.
- **GET /api/download/{reportType}**: Descarga el reporte con el TYPE especificado.
- **POST /api/token**: Genera un token de autenticación.
- **POST /api/login**: Inicia sesión en el sistema.

### Autenticación

La autenticación en esta API se realiza utilizando tokens de autenticación. Para obtener un token de autenticación, debes llamar al endpoint `/api/auth/token` con las credenciales de usuario. Una vez que obtengas el token, debes incluirlo en la cabecera de autorización de todas las solicitudes posteriores.

🔐 Ejemplo de cabecera de autorización:
```
Authorization: Bearer <token>
```

### Ejemplo de Solicitud (Carga de Archivo)

```http
POST /api/file/upload HTTP/1.1
Host: localhost:3000
Authorization: Bearer <token>
Content-Type: multipart/form-data

[file] = <archivo_a_subir>
```

## 🛢️ Base de Datos y Almacenamiento

Esta API utiliza [Supabase](https://supabase.io/) como base de datos y storage para almacenar los archivos. Asegúrate de configurar correctamente tu instancia de Supabase y de proporcionar las credenciales necesarias en las variables de entorno.

## 🤝 Contribución

Si deseas contribuir a este proyecto, por favor sigue estos pasos:

1. Haz un fork del repositorio.
2. Crea una nueva rama (`git checkout -b feature/nueva-caracteristica`).
3. Realiza tus cambios y haz commit (`git commit -am 'Agrega una nueva característica'`).
4. Haz push a la rama (`git push origin feature/nueva-caracteristica`).
5. Crea un nuevo Pull Request.

## 📌 Soporte

Si encuentras algún problema o tienes alguna pregunta, por favor crea un [issue](https://github.com/busterinc/api-customsoft/issues) en este repositorio.

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo [LICENSE](LICENSE) para más detalles.
