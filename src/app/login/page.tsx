import Link from "next/link";
import { iniciarSesion } from "../acciones";
import { FormularioConEstado } from "@/components/FormularioConEstado";

export default function Login() {
  return (
    <div className="centrado tarjeta">
      <h1>Ingresar a eTickets</h1>
      <FormularioConEstado accion={iniciarSesion} boton="Ingresar">
        <label>Correo<input name="email" type="email" required autoComplete="email" /></label>
        <label>Contraseña<input name="password" type="password" required autoComplete="current-password" /></label>
      </FormularioConEstado>
      <p className="muted pequeno">¿Eres cliente y no tienes cuenta? <Link href="/registro">Regístrate</Link></p>
    </div>
  );
}
