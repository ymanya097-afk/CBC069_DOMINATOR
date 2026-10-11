import { Response } from 'express';

export interface SSEEvent {
  type: string;
  familyId: string;
  data: any;
  timestamp: string;
}

interface ClientConnection {
  id: string;
  familyId: string;
  memberId?: string;
  res: Response;
}

class EventBus {
  private clients: ClientConnection[] = [];

  public addClient(id: string, familyId: string, memberId: string | undefined, res: Response): void {
    const client: ClientConnection = { id, familyId, memberId, res };
    this.clients.push(client);

    // Initial keepalive comment
    res.write(`: connected to House Hub event stream\n\n`);

    // Remove on disconnect
    res.on('close', () => {
      this.clients = this.clients.filter(c => c.id !== id);
    });
  }

  public broadcast(familyId: string, type: string, data: any): void {
    const event: SSEEvent = {
      type,
      familyId,
      data,
      timestamp: new Date().toISOString()
    };

    const payload = `event: ${type}\ndata: ${JSON.stringify(event)}\n\n`;

    this.clients.forEach(c => {
      if (c.familyId === familyId) {
        try {
          c.res.write(payload);
        } catch (err) {
          console.error(`Failed to push SSE to client ${c.id}:`, err);
        }
      }
    });
  }

  public getConnectedCount(familyId: string): number {
    return this.clients.filter(c => c.familyId === familyId).length;
  }
}

export const eventBus = new EventBus();
