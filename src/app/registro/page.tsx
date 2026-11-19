import Link from "next/link";
import { registrarCliente } from "../acciones";
import { FormularioConEstado } from "@/components/FormularioConEstado";

export default function Registro() {
  return (
    <div className="centrado tarjeta">
      <h1>Crear cuenta de cliente</h1>
      <FormularioConEstado accion={registrarCliente} boton="Crear cuenta">
        <label>Nombre<input name="nombre" required autoComplete="name" /></label>
        <label>Correo<input name="email" type="email" required autoComplete="email" /></label>
        <label>Contraseña<input name="password" type="password" required minLength={8} autoComplete="new-password" /></label>
      </FormularioConEstado>
      <p className="muted pequeno">¿Ya tienes cuenta? <Link href="/login">Ingresa</Link></p>
    </div>
  );
}
