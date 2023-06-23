"use strict";
$(function () {
    $("#btnForm").on("click", function (e) {
        e.preventDefault();
        var legajo = $("#legajo").val();
        var apellido = $("#apellido").val();
        var dato = {};
        dato.legajo = legajo;
        dato.apellido = apellido;
        $.ajax({
            type: 'POST',
            url: URL_API + "login",
            dataType: "json",
            data: dato,
            async: true
        })
            .done(function (obj_ret) {
            console.log(obj_ret);
            var alerta = "";
            if (obj_ret.exito) {
                localStorage.setItem("jwt", obj_ret.jwt);
                alerta = ArmarAlert(obj_ret.mensaje + " redirigiendo al principal.php...");
                setTimeout(function () {
                    $(location).attr('href', URL_BASE + "principal.html");
                }, 2000);
            }
            $("#div_mensaje").html(alerta);
        })
            .fail(function (jqXHR, textStatus, errorThrown) {
            var retorno = JSON.parse(jqXHR.responseText);
            var alerta = ArmarAlert(retorno.mensaje, "danger");
            $("#div_mensaje").html(alerta);
        });
    });
});
//# sourceMappingURL=script.js.map