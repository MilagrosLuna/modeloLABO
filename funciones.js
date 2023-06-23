"use strict";
var URL_API = "http://localhost:4321/";
var URL_BASE = "http://localhost/laboratorio/practicaparcial2/";
function ArmarAlert(mensaje, tipo) {
    if (tipo === void 0) { tipo = "success"; }
    var alerta = '<div id="alert_' + tipo + '" class="alert alert-' + tipo + ' alert-dismissable">';
    alerta += '<button type="button" class="close" data-dismiss="alert">&times;</button>';
    alerta += '<span class="d-inline-block text-truncate" style="max-width: 450px;">' + mensaje + ' </span></div>';
    return alerta;
}
//# sourceMappingURL=funciones.js.map