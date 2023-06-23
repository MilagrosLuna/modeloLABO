const express = require('express');
const app = express();
app.set('puerto', 4321);

// #region CONFIG
//AGREGO FILE SYSTEM
const fs = require('fs');
//AGREGO JSON
app.use(express.json());
//AGREGO JWT
const jwt = require("jsonwebtoken");
//SE ESTABLECE LA CLAVE SECRETA PARA EL TOKEN
app.set("key", "cl@ve_secreta");
app.use(express.urlencoded({extended:false}));
//AGREGO MULTER
const multer = require('multer');
//AGREGO MIME-TYPES
const mime = require('mime-types');
//AGREGO STORAGE
const storage = multer.diskStorage({
    destination: "public/fotos/",
});
const upload = multer({

    storage: storage
});
//AGREGO CORS (por default aplica a http://localhost)
const cors = require("cors");
//AGREGO MW 
app.use(cors());
//DIRECTORIO DE ARCHIVOS ESTÁTICOS
app.use(express.static("public"));
//AGREGO MYSQL y EXPRESS-MYCONNECTION
const mysql = require('mysql');
const myconn = require('express-myconnection');
const db_options = {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'productos_usuarios_node'
};
app.use(myconn(mysql, db_options, 'single'));
// #endregion

//#region VERIFICAR USUARIO
const verificar_usuario = express.Router();
verificar_usuario.use((request: any, response: any, next: any) => {
    // obj recibe un json
    let obj = request.body;

    request.getConnection((err: any, conn: any) => {
        if (err) throw ("Error al conectarse a la base de datos.");

        conn.query("SELECT * FROM usuarios WHERE legajo = ? AND apellido = ?", [obj.legajo, obj.apellido], (err: any, rows: any) => {
            if (err) throw ("Error en consulta de base de datos.");

            if (rows.length > 0) {
                response.obj_usuario = rows[0]; // le asigno al response el obj recibido
                next(); // Se invoca al siguiente middleware o ruta
            } else {
                response.status(401).json({
                    exito: false,
                    mensaje: "No se encontro un usuario con ese apellido y legajo",
                    jwt: null
                });
            }
        });
    });
});
//#endregion

app.post("/login", verificar_usuario, (request: any, response: any) => {
    const user = response.obj_usuario;

    const payload = {
        usuario: {
            id: user.id,
            apellido: user.apellido,
            nombre: user.nombre,
            legajo: user.legajo,
            rol: user.rol
        },
        api: "productos_usuarios_node",
    };

    const token = jwt.sign(payload, app.get("key"), {
        expiresIn: "5m"
    });

    response.status(200).json({
        exito : true,
        mensaje : "JWT creado!!!",
        jwt : token
    });

});

//#region VERIFICAR JWT
const verificar_jwt = express.Router();

verificar_jwt.use((request:any, response:any, next:any)=>{

    //SE RECUPERA EL TOKEN DEL ENCABEZADO DE LA PETICIÓN
    let token = request.headers["x-access-token"] || request.headers["authorization"];    
    if (!token) {
    response.status(401).send({error: "El JWT es requerido!!!"});
    return;}

    if(token.startsWith("Bearer")){token = token.slice(7, token.length);}

    if(token){
        //SE VERIFICA EL TOKEN CON LA CLAVE SECRETA
        jwt.verify(token, app.get("key"), (error:any, decoded:any)=>{

            if(error){
                return response.json({
                    exito: false,
                    mensaje:"El JWT NO es válido!!!"
                });
            }
            else{
                console.log("middleware verificar_jwt");
                //SE AGREGA EL TOKEN AL OBJETO DE LA RESPUESTA
                response.status(200).jwt = decoded;
                //SE INVOCA AL PRÓXIMO CALLEABLE
                next();
            }
        });
    }
});

//#endregion

app.get('/verificar_token',verificar_jwt,(request:any, response:any)=>{    
    response.status(200).json({exito:true, jwt: response.jwt});
});

//#region LISTAR productos
app.get("/productos_bd",verificar_jwt,(request:any, response:any)=>{

    request.getConnection((err:any, conn:any)=>{

        if(err) throw("Error al conectarse a la base de datos.");

        conn.query("select * from productos", (err:any, rows:any)=>{

            if(err) throw("Error en consulta de base de datos.");

            response.send(JSON.stringify(rows));
        });
    });
});
//#endregion

//#region ALTA Y BAJA
const alta_baja = express.Router();

alta_baja.use(verificar_jwt, (request:any, response:any, next:any)=>{

    console.log("middleware alta_baja");

    //SE RECUPERA EL TOKEN DEL OBJETO DE LA RESPUESTA
    let obj = response.jwt;

    if(obj.usuario.rol == "administrador"){
        //SE INVOCA AL PRÓXIMO CALLEABLE
         next();
    }
    else{
        return response.status(401).json({
            mensaje:"NO tiene el rol necesario para realizar la acción."
        });
    }
});

//#endregion

app.post('/productos_bd', alta_baja, upload.single("foto"), (request:any, response:any)=>{
   
    let file = request.file;
    let extension = mime.extension(file.mimetype);
    let obj = JSON.parse(request.body.obj);
    let path : string = file.destination + obj.codigo + "." + extension;

    fs.renameSync(file.path, path);

    obj.path = path.split("public/")[1];

    request.getConnection((err:any, conn:any)=>{

        if(err) throw("Error al conectarse a la base de datos.");

        conn.query("insert into productos set ?", [obj], (err:any, rows:any)=>{

            if(err) {console.log(err); throw("Error en consulta de base de datos.");}

            response.send("Producto agregado a la bd.");
        });
    });
});

app.post('/productos_bd/eliminar', alta_baja, (request:any, response:any)=>{
   
    let obj = request.body;
    let path_foto : string = "public/";

    request.getConnection((err:any, conn:any)=>{

        if(err) throw("Error al conectarse a la base de datos.");

        //obtengo el path de la foto del producto a ser eliminado
        conn.query("select path from productos where codigo = ?", [obj.codigo], (err:any, result:any)=>{

            if(err) throw("Error en consulta de base de datos.");
            //console.log(result[0].path);
            path_foto += result[0].path;
        });
    });

    request.getConnection((err:any, conn:any)=>{

        if(err) throw("Error al conectarse a la base de datos.");

        conn.query("delete from productos where codigo = ?", [obj.codigo], (err:any, rows:any)=>{

            if(err) {console.log(err); throw("Error en consulta de base de datos.");}

            fs.unlink(path_foto, (err:any) => {
                if (err) throw err;
                console.log(path_foto + ' fue borrado.');
            });

            response.send("Producto eliminado de la bd.");
        });
    });
});

//#region MODIFICAR
const modificar = express.Router();

modificar.use(verificar_jwt, (request:any, response:any, next:any)=>{
  
    console.log("middleware modificar");

    //SE RECUPERA EL TOKEN DEL OBJETO DE LA RESPUESTA
    let obj = response.jwt;

    if(obj.usuario.rol == "administrador" || obj.usuario.rol == "supervisor"){
        //SE INVOCA AL PRÓXIMO CALLEABLE
        next();
    }
    else{
        return response.status(401).json({
            mensaje:"NO tiene el rol necesario para realizar la acción."
        });
    }   
});


//#endregion

app.post('/productos_bd/modificar', modificar, upload.single("foto"), (request:any, response:any)=>{
    
    let file = request.file;
    let extension = mime.extension(file.mimetype);
    let obj = JSON.parse(request.body.obj);
    let path : string = file.destination + obj.codigo + "." + extension;

    fs.renameSync(file.path, path);

    obj.path = path.split("public/")[1];

    let obj_modif : any = {};
    //para excluir la pk (codigo)
    obj_modif.marca = obj.marca;
    obj_modif.precio = obj.precio;
    obj_modif.path = obj.path;

    request.getConnection((err:any, conn:any)=>{

        if(err) throw("Error al conectarse a la base de datos.");

        conn.query("update productos set ? where codigo = ?", [obj_modif, obj.codigo], (err:any, rows:any)=>{

            if(err) {console.log(err); throw("Error en consulta de base de datos.");}

            response.send("Producto modificado en la bd.");
        });
    });
});





app.listen(app.get('puerto'), ()=>{
    console.log('Servidor corriendo sobre puerto:', app.get('puerto'));
});