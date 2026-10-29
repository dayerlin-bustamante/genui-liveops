import {
  Directive,
  Input,
  OnChanges,
  SimpleChanges,
  ViewContainerRef,
  inject,
} from '@angular/core';
import { generativeRegistry } from '../core/generative.registry';

/**
 * DIRECTIVA: GenerativeHostDirective
 * ============================================================================
 * Es el motor de la **Generative UI**. Recibe el nombre de un componente
 * (ej: 'weather-card') y lo crea DINÁMICAMENTE en el DOM con createComponent,
 * inyectándole sus datos.
 *
 * ¿Por qué una directiva y no un *ngSwitch en la plantilla?
 *   Porque no sabemos de antemano qué componente renderizar: depende de lo que
 *   el LLM decidió en tiempo de ejecución. Un *ngSwitch exigiría conocer todos
 *   los casos al escribir la plantilla. Con createComponent + registry,
 *   agregar una nueva tarjeta NO toca la plantilla (solo se registra).
 *
 * Uso:
 *   <ng-container
 *     [libGenerativeHost]="widget.component"
 *     [libGenerativeData]="widget.data" />
 */
@Directive({
  selector: '[libGenerativeHost]',
  standalone: true,
})
export class GenerativeHostDirective implements OnChanges {
  // El contenedor de vistas donde crearemos el componente dinámicamente
  private readonly vcr = inject(ViewContainerRef);

  /** Nombre del componente a crear (viene del evento 'ui' del backend). */
  @Input('libGenerativeHost') component!: string;

  /** Datos que se le pasan al componente creado. */
  @Input('libGenerativeData') data: unknown;

  // Guarda la referencia del componente actual para poder destruirlo/actualizarlo
  private ref: any = null;

  ngOnChanges(changes: SimpleChanges): void {
    // Recreamos solo cuando cambia el nombre del componente o los datos
    if (changes['component'] || changes['data']) {
      this.render();
    }
  }

  private render(): void {
    const componentType = generativeRegistry[this.component];

    // Si no está en el registry, mostramos un aviso (mejor que fallar en silencio)
    if (!componentType) {
      console.warn(`GenerativeUI: componente "${this.component}" no registrado.`);
      return;
    }

    // ¿Ya hay un componente creado y es el mismo tipo? → solo actualizamos datos
    if (this.ref && this.ref.componentType === componentType) {
      this.ref.setInput('data', this.data);
      return;
    }

    // Limpiamos el anterior y creamos el nuevo dinámicamente
    this.vcr.clear();
    this.ref = this.vcr.createComponent(componentType);
    this.ref.setInput('data', this.data);

    // Lo marcamos como "block" para que se comporte como un elemento de bloque
    this.ref.location.nativeElement.classList.add('generative-widget');
  }
}
