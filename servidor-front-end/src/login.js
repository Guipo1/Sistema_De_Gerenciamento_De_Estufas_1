document.getElementById("registerForm").addEventListener("submit", function (e) {
    e.preventDefault();
    const usuario = document.getElementById("usuario").value.trim();
    const senha = document.getElementById("senha").value.trim();
    if (usuario != null & usuario != "" & senha != null & senha != "") {
        const dadosUsuario = {
            usuario: usuario,
            senha: senha
        }
        fetch("/login", { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dadosUsuario) }).then(dado => dado.json()).then(dado => {
            if (JSON.stringify(dado.cod) == 1) {
                window.location.href = "/"
            } else {
                alert("certifique-se de que as informações estejam coretas.")
            }
        });
    } else {
        alert("Preencha coretamente seus dados nos campos abaixo por favor")
    }
});