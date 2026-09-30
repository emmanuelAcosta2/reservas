-- El look genérico por defecto del producto pasa a ser modo claro con acento azul (antes el
-- naranja heredado de GG). Solo cambia el default para organizaciones nuevas; las que ya
-- eligieron su color en Ajustes → Empresa no se tocan.
alter table public.organizaciones alter column color_marca set default '#2563eb';
