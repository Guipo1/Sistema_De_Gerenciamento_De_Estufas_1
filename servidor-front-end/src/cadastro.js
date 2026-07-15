document
    .getElementById("registerForm")
    .addEventListener("submit", function (e) {

        e.preventDefault();

        const usuario =
            document.getElementById("usuario").value;

        const senha =
            document.getElementById("senha").value;

        const endereco =
            document.getElementById("endereco").value;

        const contato =
            document.getElementById("contato").value;

        const message =
            document.getElementById("message");
        const dados = {
            usuario: usuario,
            senha: senha,
            endereco: endereco,
            contato: contato
        }
        if (
            usuario === "" ||
            senha === "" ||
            endereco === "" ||
            contato === ""
        ) {

            message.className = "message error";
            message.innerHTML =
                "Preencha todos os campos.";

            return;
        } else {
            fetch("/cadastro", { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) }).then(dado => dado.json()).then(dado => {
                if (JSON.stringify(dado.cod) == 1) {
                    message.className = "message success";
                    message.innerHTML =
                        "Cadastro realizado com sucesso!";
                    window.location.href = "/login"
                } else if (JSON.stringify(dado.cod) == 0) {
                    alert("certifique-se de que as informações estejam coretas.")
                } else {
                    alert("Usuario ja existente, digite outro por favor.")
                }
            });
        }
    });
