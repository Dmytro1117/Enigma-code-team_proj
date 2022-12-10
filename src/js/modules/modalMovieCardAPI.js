import * as basicLightbox from 'basiclightbox';
import lybraryAPI from './lybraryAPI';
import storageAPI from './storageAPI';
import refsMdl from './refsMdl';
import { currentAppState } from '../main';
import firebaseAPI from './firebaseAPI';
import fetchAPI from './fetchAPI';
import { Notify } from 'notiflix';
import youTubeAPI from './youTubeAPI';
import { filmServerList } from '../utils/filmServers';

// import modalMovieCardTpl from '../../templates/modalMovieCard.hbs';
import modalMovieCardTpl from '../../templates/modal.hbs';
import galleryElementTpl from '../../templates/galleryElement.hbs';
import { async } from '@firebase/util';

async function showModalMovieCard(movieInfo) {
  let isWatched;
  let isQueued;

  if (firebaseAPI.instance.userId) {
    try {
      isWatched = await firebaseAPI.instance.isInLyb(movieInfo.id, 'watched');
      isQueued = await firebaseAPI.instance.isInLyb(movieInfo.id, 'queue');
    } catch (error) {
      console.log(error);
    }
  } else {
    const watched = storageAPI.load('watched');
    isWatched = watched ? watched.find(movie => movie.id === movieInfo.id) : null;
    const queue = storageAPI.load('queue');
    isQueued = queue ? queue.find(movie => movie.id === movieInfo.id) : null;
  }

  refsMdl.modalMovieCardEl.innerHTML = modalMovieCardTpl(movieInfo);

  const watchBtn = refsMdl.modalMovieCardEl.querySelector('.js-watch-btn');
  const queueBtn = refsMdl.modalMovieCardEl.querySelector('.js-queue-btn');
  const closeBtn = refsMdl.modalMovieCardEl.querySelector('.btn-close');
  const trailerBtn = refsMdl.modalMovieCardEl.querySelector('.js-trailer-btn');
  const gSearchBtn = refsMdl.modalMovieCardEl.querySelector('.js-gSearch-btn');
  if (!movieInfo.video) {
    youTubeAPI.setActionByYTStatus(trailerBtn);
  } else {
    trailerBtn.dataset.video = movieInfo?.video ? movieInfo?.video : '';
  }

  if (isWatched) {
    watchBtn.textContent = 'Remove from watched';
    watchBtn.dataset.action = 'remove';
  } else {
    watchBtn.textContent = 'Add to watched';
    watchBtn.dataset.action = 'add';
  }

  if (isQueued) {
    queueBtn.textContent = 'Remove from queue';
    queueBtn.dataset.action = 'remove';
  } else {
    queueBtn.textContent = 'Add to queue';
    queueBtn.dataset.action = 'add';
  }

  if (!document.querySelector('.basicLightbox')) {
    const instance = basicLightbox.create(refsMdl.modalMovieCardEl, {
      onShow: () => {
        refsMdl.body.classList.add('modal-open');
        watchBtn.addEventListener('click', lybraryAPI.lybBtnClickAction);
        queueBtn.addEventListener('click', lybraryAPI.lybBtnClickAction);

        trailerBtn.addEventListener('click', trailerBtnClickAction);
        gSearchBtn.addEventListener('click', gSearchBtnClickAction);
        watchBtn.addEventListener('click', lybBtnClick);
        queueBtn.addEventListener('click', lybBtnClick);
      },
      onClose: () => {
        refsMdl.body.classList.remove('modal-open');
        watchBtn.removeEventListener('click', lybraryAPI.lybBtnClickAction);
        queueBtn.removeEventListener('click', lybraryAPI.lybBtnClickAction);
        closeBtn.removeEventListener('click', instance.close);

        watchBtn.removeEventListener('click', lybBtnClick);
        queueBtn.removeEventListener('click', lybBtnClick);
      },
    });
    closeBtn.addEventListener('click', instance.close);
    instance.show();
  }
}

async function gSearchBtnClickAction(e) {
  const movieInfo = storageAPI.load('modalInfo');
  const query = `фильм ${movieInfo.ru_title} ${movieInfo.year} смотреть онлайн бесплатно`;
  const response = await fetchAPI.instanceGoogle.fetchGoogleSearch(query);
  if (response?.items) {
    const filtered = response.items.filter(movieInfo =>
      filmServerList.includes(movieInfo.displayLink)
    );
    if (!filtered.length) {
      Notify.failure('Нажаль нічого не вдалося знайти...');
      e.target.classList.add('is-hidden');
      return;
    }
    const markup = filtered
      .map(
        movieInfo =>
          `<li><a href="${movieInfo.link}" target="blank">${movieInfo.displayLink}</a></li>`
      )
      .join('');
    const ul = document.createElement('UL');
    ul.classList.add('js-gSearchList');
    ul.innerHTML = markup;
    refsMdl.modaGSearchEl.appendChild(ul);
    const instance = basicLightbox.create(refsMdl.modaGSearchEl);
    instance.show();
  } else {
    Notify('Нажаль нічого не вдалося знайти...');
    e.target.classList.add('is-hidden');
  }
}

async function trailerBtnClickAction(e) {
  const YTStatus = storageAPI.load('YTStatus');
  const movieInfo = storageAPI.load('modalInfo');
  if (e.target.dataset.action === 'find') {
    const query = `movie ${movieInfo.original_title} ${movieInfo.year} official trailer`;
    const response = await youTubeAPI.getYTSearch(query);
    if (!response || !response.items.length) {
      Notify.failure('Нажаль посіпакам не вдалося знайти жодного трейлера ;(');
      e.target.classList.add('is-hidden');
    } else {
      youTubeAPI.createYTIframe(response.items[0].id.videoId);
    }
  } else {
    if (e.ctrlKey && YTStatus.status) {
      const query = `фільм ${movieInfo.title} ${movieInfo.year} український трейлер`;
      const response = await youTubeAPI.getYTSearch(query);
      if (!response || !response.items.length) {
        Notify.failure('Нажаль посіпакам не вдалося знайти жодного трейлера ;(');
        e.target.classList.add('is-hidden');
      } else {
        youTubeAPI.createYTIframe(response.items[0].id.videoId);
      }
    } else {
      youTubeAPI.createYTIframe(e.target.dataset.video);
    }
  }
}

function lybBtnClick(e) {
  toggleButtonsType(e.target);
}

function toggleButtonsType(btn) {
  const arr = btn.textContent.split(' ');
  arr.splice(1, 1);
  arr[0] = arr[0] === 'Add' ? 'Remove from' : 'Add to';
  btn.textContent = arr.join(' ');
  btn.dataset.action = btn.dataset.action === 'add' ? 'remove' : 'add';
}

function showLybrary(type) {
  if (currentAppState.galleryState !== type) return;
  const lyb = storageAPI.load(currentAppState.galleryState) || [];
  refsMdl.galleryEl.innerHTML = galleryElementTpl(lyb);
}

export default {
  showModalMovieCard,
  showLybrary,
};
