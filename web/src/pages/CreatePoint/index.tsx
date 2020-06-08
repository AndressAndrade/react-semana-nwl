import React, {useEffect, useState, ChangeEvent, FormEvent} from 'react';
import {Map, TileLayer, Marker} from 'react-leaflet';
import {FiArrowLeft} from 'react-icons/fi';
import logo from '../../assets/logo.svg';
import {Link, useHistory} from 'react-router-dom';
import {LeafletMouseEvent} from 'leaflet';
import './styles.css';

import api from '../../services/api';
import ibge from '../../services/ibge';

import Dropzone from '../../components/dropzone';

interface Item {
    id: number;
    title: string;
    image_url: string;
}

interface UF {
    id: number;
    sigla: string;
    nome: string;
    regiao: {
        id: number,
        sigla: string,
        nome: string
    }
}

interface Cidade {
    nome: string;
}

const CreatePoint = () => {

    const [items, setItems] = useState<Item[]>([]);
    const [estados, setEstados] = useState<string[]>([]);
    const [cidades, setCidades] = useState<string[]>([]);
    const [selectedItems, setSelectedItems] = useState<number[]>([]);

    const [selectedPosition, setSelectedPosition] = useState<[number,number]>([0,0]);
    const [initialPosition, setInitialPosition] = useState<[number,number]>([-12.950951, -38.426164]);
    
    const [selectedCity, setSelectedCity] = useState<string>('0');
    const [selectedUf, setSelectedUf] = useState<string>('0');

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        whatsapp: ''
    });

    const [selectedFile, setSelectedFile] = useState<File>();

    const history = useHistory();

    // Obtendo posição do usuário
    useEffect(()=>{
        navigator.geolocation.getCurrentPosition(position => {
            const {latitude, longitude} = position.coords;
            console.log(latitude + ' ' + longitude)
            setInitialPosition([
                latitude,
                longitude
            ]);
        });
    }, []);

    // Items
    useEffect(()=>{
        api.get('items').then(
            response => {
                setItems(response.data.serializedItems);
            }
        );
    }, []);

    // Estados ordenados
    useEffect(()=>{
        ibge.get<UF[]>('estados',{
            params: {
                orderBy: 'nome'
            }
        }).then(
            response => {
                const ufInitials = response
                    .data
                    .map(uf => uf.sigla);
                setEstados(ufInitials);
            }
        );
    }, []);

    // Cidades ordernadas
    useEffect(()=>{
        if (selectedUf === '0') {
            return;
        }
        ibge.get<Cidade[]>(`estados/${selectedUf}/municipios`,{
            params: {
                orderBy: 'nome'
            }
        }).then(
            response => {
                const cities = response
                    .data
                    .map(city => city.nome);
                setCidades(cities);
            }
        );
    }, [selectedUf]);

    function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
        const {name, value} = event.target;
        setFormData({
            ...formData, [name]: value 
        });
    }

    function handleSelectedUF (event: ChangeEvent<HTMLSelectElement>) {
        setSelectedUf(event.target.value);
    }

    function handleSelectedCity (event: ChangeEvent<HTMLSelectElement>) {
        setSelectedCity(event.target.value);
    }

    function handleSelectedItem(id: number) {
        const alreadySelected = selectedItems.includes(id);
        if (alreadySelected) {
            const filteredItems = selectedItems.filter(item => item !== id);
            setSelectedItems(filteredItems);
        }
        else {
            setSelectedItems([...selectedItems, id]);
        }
    }

    function handleMapClick (event: LeafletMouseEvent) {
        setSelectedPosition([
            event.latlng.lat,
            event.latlng.lng
        ]);
    }

    function handleSubmit (event: FormEvent) {
        event.preventDefault();

        const data = new FormData();
        data.append('name', formData.name);
        data.append('email', formData.email);
        data.append('whatsapp', formData.whatsapp);
        data.append('latitude', String(selectedPosition[0]));
        data.append('longitude', String(selectedPosition[1]));
        data.append('city', selectedCity);
        data.append('uf',selectedUf);
        data.append('items', selectedItems.join(','));
        
        if (selectedFile) {
            data.append('image', selectedFile);
        }

        api.post('points', data)
        .then(response => {
            alert('Ponto de Coleta criado');
            history.push('/');
        }).catch(error => {
            alert('Erro: ' + error.message);
        });
    }

    return (
        <div id="page-create-point">
            <header>
                <img src={logo} alt="Ecoleta"/>
                <Link to="/">
                    <FiArrowLeft/>
                    Voltar para home
                </Link>
            </header>
            <form>

                <h1>
                    Cadastro do <br/> ponto de coleta
                </h1>

                {/* Area de dropzone */}
                <Dropzone onFileUploaded={setSelectedFile} />

                {/* Nome/Email/Whatsapp */}
                <fieldset>
                    <legend>
                        <h2>Dados</h2>
                    </legend>
                    <div className="field">
                        <label htmlFor="name">Nome da entidade</label>
                        <input
                            type="text"
                            name="name"
                            id="name"
                            onChange={handleInputChange}
                        />
                    </div>
                    <div className="field-group">
                        <div className="field">
                            <label htmlFor="email">E-mail</label>
                            <input
                                type="email"
                                name="email"
                                id="email"
                                onChange={handleInputChange}
                            />
                        </div>
                        <div className="field">
                            <label htmlFor="whatsapp">Whatsapp</label>
                            <input
                                type="text"
                                name="whatsapp"
                                id="whatsapp"
                                onChange={handleInputChange}
                            />
                        </div>
                    </div>
                </fieldset>

                {/* Mapa */}
                <fieldset>

                    <legend>
                        <h2>Endereço</h2>
                        <span>Selecione o endereço no mapa</span>
                    </legend>

                    <Map center={initialPosition} zoom={15} onClick={handleMapClick}>
                        <TileLayer
                            attribution='&amp;copy <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <Marker position={selectedPosition}>
                        </Marker>
                    </Map>

                    {/* Estado/Cidade */}
                    <div className="field-group">
                        <div className="field">
                            <label htmlFor="uf" id="uf">Estado (UF)</label>
                            <select name="uf" id="uf" value={selectedUf} onChange={handleSelectedUF}>
                                <option value="0">Selecione uma UF</option>
                                {estados.map(estado => (
                                    <option key={estado} value={estado}>{estado}</option>
                                ))}
                            </select>
                        </div>
                        <div className="field">
                            <label htmlFor="city" id="cidade">Cidade</label>
                            <select name="city" id="city" value={selectedCity} onChange={handleSelectedCity}>
                                <option value="0">Selecione uma cidade</option>
                                {cidades.map(cidade => (
                                    <option key={cidade} value={cidade}>{cidade}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                </fieldset>

                {/* Itens coleta */}
                <fieldset>
                    <legend>
                        <h2>Itens de coleta</h2>
                        <span>Selecione um ou mais dos itens abaixo</span>
                    </legend>
                    <ul className="items-grid">
                        {items.map(item => (
                            <li 
                                key={item.id}
                                onClick={() => handleSelectedItem(item.id)}
                                className={selectedItems.includes(item.id) ? 'selected' : ''}
                            >
                                <img src={item.image_url} alt={item.title}/>
                                <span>{item.title}</span>
                            </li>)) 
                        }    
                    </ul>
                </fieldset>

                <button type="submit" onClick={handleSubmit}>Cadastrar ponto de coleta</button>

            </form>
        </div>
    );
}

export default CreatePoint;