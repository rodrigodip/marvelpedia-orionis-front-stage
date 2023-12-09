import { Component, Input, OnInit } from '@angular/core';
import { MarvelContentApi } from 'src/app/core/api/app/marvel-content.api';
import { EnumContentCategory } from 'src/app/core/api/interfaces/IMarvelContent';
import {
  IComment,
  IDataContent,
  IResponsePosters,
  IResponseStandardPoster,
  IHeaderDetails,
} from './interface/media-explorer';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
@Component({
  selector: 'app-media-explorer',
  templateUrl: './media-explorer.component.html',
  styleUrls: ['./media-explorer.component.scss'],
})
export class MediaExplorerComponent implements OnInit {
  constructor(
    private marvelContentApi: MarvelContentApi,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {
    this.dataContent = this?.router?.getCurrentNavigation()?.extras?.state;
  }

  loading = false;
  dataContent: any;
  commentList: IComment[] = [];
  totalComments = 0;
  pageNumber = 1;
  disableButtonPreviousPage = true;
  disableButtonNextPage = false;
  newComment = { comment: '' };
  showNotFoundMessage = false;
  showNextPreviousButtons = false;
  postersFilter: Array<IResponseStandardPoster> = [];

  posters: IResponsePosters = {
    data: [],
  };

  currentCardContent = {
    title: 'titulo do card a ser exibido',
    description: 'Descrição do card a ser exibido',
    thumb: 'url do thumb do card a ser exibido',
    externalLink: 'link de detalhes',
  };

  headerData: IHeaderDetails = {
    description: '',
    title: '',
    thumb: '',
    link: '',
  };

  /**
   * ngOnInit
   * Lifecycle que carrega os dados de posters ao inicializar a página.
   */
  ngOnInit(): void {
    this.getCommentList(
      this.dataContent.categoryContent,
      this.dataContent.idContent,
      this.pageNumber,
    );

    this.marvelContentApi.getNumberOfPosters(4).then((postersResponse) => {
      this.posters = postersResponse;
      this.postersFilter = this.posters.data;
    });
    this.getHeaderDetails();
  }

  /**
   * getHeaderDetails
   *
   * Obtém os detalhes do cabeçalho para o conteúdo Marvel e aramzena na propriedade headerData.
   * Utiliza o 'dataContent' para mandar a categoria e o id do conteúdo.
   *
   * @returns {Promise<void>} Uma promise que é resolvida quando a operação é concluída.
   */
  async getHeaderDetails(): Promise<void> {
    try {
      const response = await this.marvelContentApi.getDetailsCategory(
        this.dataContent.categoryContent,
        this.dataContent.idContent,
      );
      this.headerData = response.data;
    } catch (err: any) {
      this.openSnackBar(`Erro ao receber dados do conteúdo.`, 'Fechar');
    }
  }

  /**
   * getCommentList
   *
   * Obtém a lista de comentários para o conteúdo atual.
   *
   * Realiza uma chamada à API para trazer a lista de comentários associada
   * a um conteúdo específico da Marvel.
   *
   * @param category - A categoria do conteúdo Marvel
   * @param categoryId - O ID do conteúdo Marvel.
   * @param pageNumber - O número da página de comentários a ser exibida.
   */
  async getCommentList(
    category: EnumContentCategory,
    categoryId: number,
    pageNumber: number,
  ): Promise<void> {
    this.showNotFoundMessage = false;
    try {
      const response = await this.marvelContentApi.getCommentsByCategoryId(
        category,
        categoryId,
        pageNumber,
      );
      this.showNextPreviousButtons = true;
      this.commentList = response.commentsWithUserComment;
      //número total de comentários disponibilizados pela API em relação ao conteúdo Marvel
      this.totalComments = response.data.totalComments;
      if (3 * pageNumber >= this.totalComments) {
        this.disableButtonNextPage = true;
        this.loading = false;
        return;
      }
      this.disableButtonNextPage = false;
      this.loading = false;
    } catch (err: any) {
      if (pageNumber > 1) {
        this.previousPageComments();
        this.loading = false;
        return;
      }
      if (err.error.data === 'Página não encontrada.') {
        this.showNotFoundMessage = true;
        this.showNextPreviousButtons = false;
        this.commentList = [];
      }
      this.loading = false;
    }
  }

  /**
   * createNewComment
   *
   * Esta função usa o service `MarvelContentApi` para enviar um novo comentário à API.
   * Após o envio, exibe uma mensagem de sucesso usando `openSnackBar`, limpa o campo de comentário para preparar para um novo comentário e atualiza a lista de comentários chamando `getCommentList`.
   *
   * @param category - A categoria do conteúdo Marvel
   * @param categoryId - O ID do conteúdo Marvel.
   * @param newComment - Um objeto contendo o novo comentário a ser enviado.
   */

  async createNewComment(
    category: EnumContentCategory,
    categoryId: number,
    newComment: object,
  ): Promise<void> {
    try {
      await this.marvelContentApi.createUserComment(
        category,
        categoryId,
        newComment,
      );
      this.openSnackBar(`Seu comentário foi publicado com sucesso!`, 'Fechar');
      this.newComment.comment = '';
      this.pageNumber = 1;
      this.getCommentList(
        this.dataContent.categoryContent,
        this.dataContent.idContent,
        this.pageNumber,
      );
    } catch (err: any) {
      this.loading = false;
      if (err.error.data == 'O comentário contém palavras impróprias.') {
        this.openSnackBar(err.error.data, 'Fechar');
        this.loading = false;
        return;
      }
      this.openSnackBar(`Houve um erro ao publicar o comentário.`, 'Fechar');
      this.loading = false;
    }
  }

  /**
   * handleCommentDelete
   *
   * A função usa o service `MarvelContentApi` para excluir um comentário com o ID fornecido. Após a exclusão, exibe uma mensagem de sucesso utilizando `openSnackBar` e atualiza a lista de comentários chamando `getCommentList`.
   *
   * @param commentId - O ID do comentário a ser excluído
   */
  async handleDeleteComment(commentId: number): Promise<void> {
    this.loading = true;
    try {
      await this.marvelContentApi.deleteUserComment(commentId);
      this.openSnackBar(`Seu comentário foi excluído!`, 'Fechar');
      this.getCommentList(
        this.dataContent.categoryContent,
        this.dataContent.idContent,
        this.pageNumber,
      );
    } catch (err) {
      this.openSnackBar(`Não foi possível excluir o comentário!`, 'Fechar');
      this.loading = false;
    }
  }

  /**
   * createComment
   *
   * Esta função é chamada quando o usuário quando o usuário clica no botão "Comentar". Ela realiza a chamada da função `createNewComment` para enviar o novo comentário que está armazenado na variável "newComment".
   */
  createComment(): void {
    this.loading = true;
    this.createNewComment(
      this.dataContent.categoryContent,
      this.dataContent.idContent,
      this.newComment,
    );
  }

  /**
   * nextPageComments
   *
   * A função é chamada quando o usuário deseja visualizar a próxima página de comentários.
   */
  nextPageComments(): void {
    this.loading = true;
    this.disableButtonPreviousPage = false;
    this.pageNumber++;
    this.getCommentList(
      this.dataContent.categoryContent,
      this.dataContent.idContent,
      this.pageNumber,
    );
  }

  /**
   * previousPageComments
   *
   * A função é chamada quando o usuário deseja visualizar a página anterior de comentários.
   */
  previousPageComments(): void {
    this.loading = true;
    this.pageNumber--;
    this.disableButtonNextPage = false;
    this.disableButtonPreviousPage = this.pageNumber === 1 ? true : false;
    this.getCommentList(
      this.dataContent.categoryContent,
      this.dataContent.idContent,
      this.pageNumber,
    );
  }

  /**
   * openSnackBar
   *
   * Abre um componente de Snackbar do Angular Material exibindo uma mensagem para o usuário e um botão de ação.
   *
   * @param message - Menssagem a ser exibida na snackbar
   * @param action - Ação a ser executada no botão da snackbar
   */
  openSnackBar(message: string, action: string): void {
    this.snackBar.open(message, action, {
      duration: 3000, // Duração em milissegundos
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['snackbar-1'],
    });
  }
}